/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout } from 'timers/promises';
import type {
  ClusterPutComponentTemplateRequest,
  IndicesPutIndexTemplateRequest,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { isRetryableEsClientError } from '@kbn/core-elasticsearch-server-utils';
import {
  SERVICE_MAP_EDGES_INDEX,
  SERVICE_MAP_ENTRY_POINTS_INDEX,
  SERVICE_MAP_TRANSFORM_VERSION,
} from './constants';

// Component template names
const SERVICE_MAP_MAPPINGS_COMPONENT_TEMPLATE = '.apm-service-map-mappings';
const SERVICE_MAP_SETTINGS_COMPONENT_TEMPLATE = '.apm-service-map-settings';

// Index template names
const SERVICE_MAP_EDGES_INDEX_TEMPLATE = '.apm-service-map-edges-template';
const SERVICE_MAP_ENTRY_POINTS_INDEX_TEMPLATE = '.apm-service-entry-points-template';

const MAX_RETRY_ATTEMPTS = 5;

/**
 * Component template for service map settings.
 * Shared settings for all service map indices.
 */
const SERVICE_MAP_SETTINGS_TEMPLATE: ClusterPutComponentTemplateRequest = {
  name: SERVICE_MAP_SETTINGS_COMPONENT_TEMPLATE,
  template: {
    settings: {
      index: {
        number_of_shards: 1,
        auto_expand_replicas: '0-1',
        refresh_interval: '5s',
        codec: 'best_compression',
      },
      // Hidden indices - not shown in standard index listings
      hidden: true,
    },
  },
  _meta: {
    description: 'APM service map settings template',
    version: SERVICE_MAP_TRANSFORM_VERSION,
    managed: true,
    managed_by: 'apm',
  },
};

/**
 * Component template for service map edges mappings.
 */
const SERVICE_MAP_EDGES_MAPPINGS_TEMPLATE: ClusterPutComponentTemplateRequest = {
  name: `${SERVICE_MAP_MAPPINGS_COMPONENT_TEMPLATE}-edges`,
  template: {
    mappings: {
      dynamic: 'strict',
      properties: {
        // Group by fields
        source_service: { type: 'keyword' },
        source_agent_name: { type: 'keyword' },
        source_environment: { type: 'keyword' },
        destination_resource: { type: 'keyword' },
        span_type: { type: 'keyword' },
        span_subtype: { type: 'keyword' },
        // Aggregated metrics
        last_seen: { type: 'date', format: 'date_optional_time||epoch_millis' },
        first_seen: { type: 'date', format: 'date_optional_time||epoch_millis' },
        span_count: { type: 'long' },
        // top_metrics aggregation output for edge correlation and resolution
        // hasSpanLinks is derived from presence of span.links.span_id or otel.span.links.span_id
        sample_span: {
          properties: {
            'span.id': { type: 'keyword' },
            'span.links.span_id': { type: 'keyword' },
            'otel.span.links.span_id': { type: 'keyword' },
          },
        },
      },
    },
  },
  _meta: {
    description: 'APM service map edges mappings template',
    version: SERVICE_MAP_TRANSFORM_VERSION,
    managed: true,
    managed_by: 'apm',
  },
};

/**
 * Component template for service entry points mappings.
 */
const SERVICE_MAP_ENTRY_POINTS_MAPPINGS_TEMPLATE: ClusterPutComponentTemplateRequest = {
  name: `${SERVICE_MAP_MAPPINGS_COMPONENT_TEMPLATE}-entry-points`,
  template: {
    mappings: {
      dynamic: 'strict',
      properties: {
        // Group by fields
        service_name: { type: 'keyword' },
        service_environment: { type: 'keyword' },
        // Aggregated metrics
        transaction_count: { type: 'long' },
        last_seen: { type: 'date', format: 'date_optional_time||epoch_millis' },
        first_seen: { type: 'date', format: 'date_optional_time||epoch_millis' },
      },
    },
  },
  _meta: {
    description: 'APM service entry points mappings template',
    version: SERVICE_MAP_TRANSFORM_VERSION,
    managed: true,
    managed_by: 'apm',
  },
};

/**
 * Index template for service map edges.
 * Composes settings and edges mappings component templates.
 */
const SERVICE_MAP_EDGES_INDEX_TEMPLATE_DEF: IndicesPutIndexTemplateRequest = {
  name: SERVICE_MAP_EDGES_INDEX_TEMPLATE,
  index_patterns: [SERVICE_MAP_EDGES_INDEX],
  composed_of: [
    SERVICE_MAP_SETTINGS_COMPONENT_TEMPLATE,
    `${SERVICE_MAP_MAPPINGS_COMPONENT_TEMPLATE}-edges`,
  ],
  priority: 500,
  _meta: {
    description: 'APM service map edges index template',
    version: SERVICE_MAP_TRANSFORM_VERSION,
    managed: true,
    managed_by: 'apm',
  },
};

/**
 * Index template for service entry points.
 * Composes settings and entry points mappings component templates.
 */
const SERVICE_MAP_ENTRY_POINTS_INDEX_TEMPLATE_DEF: IndicesPutIndexTemplateRequest = {
  name: SERVICE_MAP_ENTRY_POINTS_INDEX_TEMPLATE,
  index_patterns: [SERVICE_MAP_ENTRY_POINTS_INDEX],
  composed_of: [
    SERVICE_MAP_SETTINGS_COMPONENT_TEMPLATE,
    `${SERVICE_MAP_MAPPINGS_COMPONENT_TEMPLATE}-entry-points`,
  ],
  priority: 500,
  _meta: {
    description: 'APM service entry points index template',
    version: SERVICE_MAP_TRANSFORM_VERSION,
    managed: true,
    managed_by: 'apm',
  },
};

/**
 * Retries transient ES errors with exponential backoff.
 * Based on SLO's retry utility.
 */
async function retryTransientEsErrors<T>(
  esCall: () => Promise<T>,
  { logger, attempt = 0 }: { logger?: Logger; attempt?: number } = {}
): Promise<T> {
  try {
    return await esCall();
  } catch (e) {
    if (attempt < MAX_RETRY_ATTEMPTS && isRetryableEsClientError(e)) {
      const retryCount = attempt + 1;
      const retryDelaySec = Math.min(Math.pow(2, retryCount), 64);

      logger?.warn(`Retrying ES operation after [${retryDelaySec}s] due to error: ${e.toString()}`);

      await setTimeout(retryDelaySec * 1000);
      return retryTransientEsErrors(esCall, { logger, attempt: retryCount });
    }
    throw e;
  }
}

/**
 * Service map resource installer.
 * Creates and manages index templates and component templates for service map transforms.
 * Follows the same pattern as SLO's DefaultResourceInstaller.
 */
export class ServiceMapResourceInstaller {
  constructor(private esClient: ElasticsearchClient, private logger: Logger) {}

  /**
   * Ensures all service map resources (component templates, index templates) are installed.
   * Skips installation if resources already exist with the same version.
   */
  async ensureResourcesInstalled(): Promise<void> {
    try {
      this.logger.debug('Installing service map resources');

      // Create component templates first (in parallel)
      await Promise.all([
        this.createOrUpdateComponentTemplate(SERVICE_MAP_SETTINGS_TEMPLATE),
        this.createOrUpdateComponentTemplate(SERVICE_MAP_EDGES_MAPPINGS_TEMPLATE),
        this.createOrUpdateComponentTemplate(SERVICE_MAP_ENTRY_POINTS_MAPPINGS_TEMPLATE),
      ]);

      // Create index templates (must be after component templates)
      await this.createOrUpdateIndexTemplate(SERVICE_MAP_EDGES_INDEX_TEMPLATE_DEF);
      await this.createOrUpdateIndexTemplate(SERVICE_MAP_ENTRY_POINTS_INDEX_TEMPLATE_DEF);

      this.logger.info('Service map resources installed successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error installing service map resources: ${message}`);
      throw err;
    }
  }

  /**
   * Deletes all service map resources.
   */
  async deleteResources(deleteIndices = false): Promise<void> {
    try {
      this.logger.debug('Deleting service map resources');

      // Delete index templates first
      await this.execute(() =>
        this.esClient.indices.deleteIndexTemplate(
          { name: SERVICE_MAP_EDGES_INDEX_TEMPLATE },
          { ignore: [404] }
        )
      );
      await this.execute(() =>
        this.esClient.indices.deleteIndexTemplate(
          { name: SERVICE_MAP_ENTRY_POINTS_INDEX_TEMPLATE },
          { ignore: [404] }
        )
      );

      // Delete component templates
      await this.execute(() =>
        this.esClient.cluster.deleteComponentTemplate(
          { name: SERVICE_MAP_SETTINGS_COMPONENT_TEMPLATE },
          { ignore: [404] }
        )
      );
      await this.execute(() =>
        this.esClient.cluster.deleteComponentTemplate(
          { name: `${SERVICE_MAP_MAPPINGS_COMPONENT_TEMPLATE}-edges` },
          { ignore: [404] }
        )
      );
      await this.execute(() =>
        this.esClient.cluster.deleteComponentTemplate(
          { name: `${SERVICE_MAP_MAPPINGS_COMPONENT_TEMPLATE}-entry-points` },
          { ignore: [404] }
        )
      );

      // Optionally delete indices
      if (deleteIndices) {
        await this.execute(() =>
          this.esClient.indices.delete(
            { index: [SERVICE_MAP_EDGES_INDEX, SERVICE_MAP_ENTRY_POINTS_INDEX] },
            { ignore: [404] }
          )
        );
        this.logger.info('Deleted service map indices');
      }

      this.logger.info('Service map resources deleted successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error deleting service map resources: ${message}`);
      throw err;
    }
  }

  private async createOrUpdateComponentTemplate(
    template: ClusterPutComponentTemplateRequest
  ): Promise<void> {
    const currentVersion = await this.fetchComponentTemplateVersion(template.name);

    if (template._meta?.version && currentVersion === template._meta.version) {
      this.logger.debug(
        `Service map component template [${template.name}] already at version [${template._meta.version}]`
      );
      return;
    }

    this.logger.debug(`Installing service map component template [${template.name}]`);
    await this.execute(() => this.esClient.cluster.putComponentTemplate(template));
  }

  private async createOrUpdateIndexTemplate(
    template: IndicesPutIndexTemplateRequest
  ): Promise<void> {
    const currentVersion = await this.fetchIndexTemplateVersion(template.name);

    if (template._meta?.version && currentVersion === template._meta.version) {
      this.logger.debug(
        `Service map index template [${template.name}] already at version [${template._meta.version}]`
      );
      return;
    }

    this.logger.debug(`Installing service map index template [${template.name}]`);
    await this.execute(() => this.esClient.indices.putIndexTemplate(template));
  }

  private async fetchComponentTemplateVersion(name: string): Promise<number | null> {
    const response = await this.execute(() =>
      this.esClient.cluster.getComponentTemplate({ name }, { ignore: [404] })
    );
    return (
      (response?.component_templates?.[0]?.component_template?._meta?.version as number) ?? null
    );
  }

  private async fetchIndexTemplateVersion(name: string): Promise<number | null> {
    const response = await this.execute(() =>
      this.esClient.indices.getIndexTemplate({ name }, { ignore: [404] })
    );
    return (response?.index_templates?.[0]?.index_template?._meta?.version as number) ?? null;
  }

  private async execute<T>(esCall: () => Promise<T>): Promise<T> {
    return retryTransientEsErrors(esCall, { logger: this.logger });
  }
}

/**
 * Creates index templates for service map transform destination indices.
 * Convenience wrapper around ServiceMapResourceInstaller.
 */
export async function createServiceMapIndexTemplates({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<void> {
  const installer = new ServiceMapResourceInstaller(esClient, logger);
  await installer.ensureResourcesInstalled();
}

/**
 * Deletes service map index templates and optionally the indices.
 */
export async function deleteServiceMapIndexTemplates({
  esClient,
  logger,
  deleteIndices = false,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  deleteIndices?: boolean;
}): Promise<void> {
  const installer = new ServiceMapResourceInstaller(esClient, logger);
  await installer.deleteResources(deleteIndices);
}
