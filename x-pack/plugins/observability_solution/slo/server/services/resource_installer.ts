/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ClusterPutComponentTemplateRequest,
  IndicesPutIndexTemplateRequest,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { getSLOMappingsTemplate } from '../assets/component_templates/slo_mappings_template';
import { getSLOSettingsTemplate } from '../assets/component_templates/slo_settings_template';
import { getSLOSummaryMappingsTemplate } from '../assets/component_templates/slo_summary_mappings_template';
import { getSLOSummarySettingsTemplate } from '../assets/component_templates/slo_summary_settings_template';
import {
  SLO_COMPONENT_TEMPLATE_MAPPINGS_NAME,
  SLO_COMPONENT_TEMPLATE_SETTINGS_NAME,
  SLO_DESTINATION_INDEX_NAME,
  SLO_INDEX_TEMPLATE_NAME,
  SLO_INDEX_TEMPLATE_PATTERN,
  SLO_SUMMARY_COMPONENT_TEMPLATE_MAPPINGS_NAME,
  SLO_SUMMARY_COMPONENT_TEMPLATE_SETTINGS_NAME,
  SLO_SUMMARY_DESTINATION_INDEX_NAME,
  SLO_SUMMARY_INDEX_TEMPLATE_NAME,
  SLO_SUMMARY_INDEX_TEMPLATE_PATTERN,
  SLO_SUMMARY_TEMP_INDEX_NAME,
} from '../../common/constants';
import { getSLOIndexTemplate } from '../assets/index_templates/slo_index_templates';
import { getSLOSummaryIndexTemplate } from '../assets/index_templates/slo_summary_index_templates';

import { retryTransientEsErrors } from '../utils/retry';

export interface ResourceInstaller {
  ensureCommonResourcesInstalled(): Promise<void>;
}

export class DefaultResourceInstaller implements ResourceInstaller {
  constructor(private esClient: ElasticsearchClient, private logger: Logger) {}

  public async ensureCommonResourcesInstalled(): Promise<void> {
    try {
      this.logger.info('Installing SLO shared resources');
      await Promise.all([
        this.createOrUpdateComponentTemplate(
          getSLOMappingsTemplate(SLO_COMPONENT_TEMPLATE_MAPPINGS_NAME)
        ),
        this.createOrUpdateComponentTemplate(
          getSLOSettingsTemplate(SLO_COMPONENT_TEMPLATE_SETTINGS_NAME)
        ),
        this.createOrUpdateComponentTemplate(
          getSLOSummaryMappingsTemplate(SLO_SUMMARY_COMPONENT_TEMPLATE_MAPPINGS_NAME)
        ),
        this.createOrUpdateComponentTemplate(
          getSLOSummarySettingsTemplate(SLO_SUMMARY_COMPONENT_TEMPLATE_SETTINGS_NAME)
        ),
      ]);

      await this.createOrUpdateIndexTemplate(
        getSLOIndexTemplate(SLO_INDEX_TEMPLATE_NAME, SLO_INDEX_TEMPLATE_PATTERN, [
          SLO_COMPONENT_TEMPLATE_MAPPINGS_NAME,
          SLO_COMPONENT_TEMPLATE_SETTINGS_NAME,
        ])
      );

      await this.createOrUpdateIndexTemplate(
        getSLOSummaryIndexTemplate(
          SLO_SUMMARY_INDEX_TEMPLATE_NAME,
          SLO_SUMMARY_INDEX_TEMPLATE_PATTERN,
          [
            SLO_SUMMARY_COMPONENT_TEMPLATE_MAPPINGS_NAME,
            SLO_SUMMARY_COMPONENT_TEMPLATE_SETTINGS_NAME,
          ]
        )
      );

      await this.createIndex(SLO_DESTINATION_INDEX_NAME);
      await this.createIndex(SLO_SUMMARY_DESTINATION_INDEX_NAME);
      await this.createIndex(SLO_SUMMARY_TEMP_INDEX_NAME);
    } catch (err) {
      this.logger.error(`Error installing resources shared for SLO: ${err.message}`);
      throw err;
    }
  }

  private async createOrUpdateComponentTemplate(template: ClusterPutComponentTemplateRequest) {
    const currentVersion = await fetchComponentTemplateVersion(
      template.name,
      this.logger,
      this.esClient
    );
    if (template._meta?.version && currentVersion === template._meta.version) {
      this.logger.info(`SLO component template found with version [${template._meta.version}]`);
    } else {
      this.logger.info(`Installing SLO component template [${template.name}]`);
      return this.execute(() => this.esClient.cluster.putComponentTemplate(template));
    }
  }

  private async createOrUpdateIndexTemplate(template: IndicesPutIndexTemplateRequest) {
    const currentVersion = await fetchIndexTemplateVersion(
      template.name,
      this.logger,
      this.esClient
    );

    if (template._meta?.version && currentVersion === template._meta.version) {
      this.logger.info(`SLO index template found with version [${template._meta.version}]`);
    } else {
      this.logger.info(`Installing SLO index template [${template.name}]`);
      return this.execute(() => this.esClient.indices.putIndexTemplate(template));
    }
  }

  private async createIndex(indexName: string) {
    try {
      await this.execute(() => this.esClient.indices.create({ index: indexName }));
    } catch (err) {
      if (err?.meta?.body?.error?.type !== 'resource_already_exists_exception') {
        throw err;
      }
    }
  }

  private async execute<T>(esCall: () => Promise<T>): Promise<T> {
    return await retryTransientEsErrors(esCall, { logger: this.logger });
  }
}

async function fetchComponentTemplateVersion(
  name: string,
  logger: Logger,
  esClient: ElasticsearchClient
) {
  const getTemplateRes = await retryTransientEsErrors(
    () =>
      esClient.cluster.getComponentTemplate(
        {
          name,
        },
        {
          ignore: [404],
        }
      ),
    { logger }
  );

  return getTemplateRes?.component_templates?.[0]?.component_template?._meta?.version || null;
}

async function fetchIndexTemplateVersion(
  name: string,
  logger: Logger,
  esClient: ElasticsearchClient
) {
  const getTemplateRes = await retryTransientEsErrors(
    () =>
      esClient.indices.getIndexTemplate(
        {
          name,
        },
        {
          ignore: [404],
        }
      ),
    { logger }
  );

  return getTemplateRes?.index_templates?.[0]?.index_template?._meta?.version || null;
}
