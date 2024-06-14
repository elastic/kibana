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
import { retryTransientEsErrors } from '../../utils/retry';
import { getAnnotationIndexTemplate } from './index_templates/annotation_index_templates';
import { getAnnotationMappingsTemplate } from './component_templates/annotation_mappings_template';
import { getAnnotationSettingsTemplate } from './component_templates/annotation_settings_template';

export class AnnotationResourceInstaller {
  private isInstalling = false;

  constructor(
    private esClient: ElasticsearchClient,
    private index: string,
    private logger: Logger
  ) {}

  public async install() {
    if (this.isInstalling) {
      return;
    }
    this.isInstalling = true;

    let installTimeout;
    try {
      installTimeout = setTimeout(() => (this.isInstalling = false), 60000);

      await this.ensureCommonResourcesInstalled();
    } catch (error) {
      this.logger.error('Failed to install Annotation common resources');
    } finally {
      this.isInstalling = false;
      clearTimeout(installTimeout);
    }
  }

  public async ensureCommonResourcesInstalled(): Promise<void> {
    try {
      this.logger.info('Installing Annotation shared resources');
      await Promise.all([
        this.createOrUpdateComponentTemplate(getAnnotationMappingsTemplate()),
        this.createOrUpdateComponentTemplate(getAnnotationSettingsTemplate()),
      ]);

      await this.createOrUpdateIndexTemplate(getAnnotationIndexTemplate(this.index));
    } catch (err) {
      this.logger.error(`Error installing resources shared for Annotation: ${err.message}`);
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
      this.logger.info(
        `Annotation component template found with version [${template._meta.version}]`
      );
    } else {
      this.logger.info(`Installing Annotation component template [${template.name}]`);
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
      this.logger.info(`Annotation index template found with version [${template._meta.version}]`);
    } else {
      this.logger.info(`Installing Annotation index template [${template.name}]`);
      return this.execute(() => this.esClient.indices.putIndexTemplate(template));
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
