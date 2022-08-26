/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ClusterPutComponentTemplateRequest,
  IndicesPutIndexTemplateRequest,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';

import {
  SLO_COMPONENT_TEMPLATE_MAPPINGS_NAME,
  SLO_COMPONENT_TEMPLATE_SETTINGS_NAME,
  SLO_INDEX_TEMPLATE_NAME,
} from '../../assets/common';
import { sloMappingsTemplate } from '../../assets/component_templates/slo_mappings_template';
import { sloSettingsTemplate } from '../../assets/component_templates/slo_settings_template';
import { sloIndexTemplate } from '../../assets/index_templates/slo_index_templates';

const DEFAULT_INSTALLATION_TIMEOUT = 60 * 1000; // 1 minute

type ResourceInstallerConfig = {
  installationTimeout: number;
};

export class ResourceInstaller {
  constructor(
    private esClient: ElasticsearchClient,
    private logger: Logger,
    private config: ResourceInstallerConfig = { installationTimeout: DEFAULT_INSTALLATION_TIMEOUT }
  ) {}

  public async ensureCommonResourcesInstalled(): Promise<void> {
    const existingIndexTemplate = await this.checkIndexTemplateExists();

    if (existingIndexTemplate) {
      this.logger.debug(`Skipping installation of resources shared between all SLO indices`);
      return;
    }

    await this.withTimeout('resources shared between all SLO indices', async () => {
      try {
        await Promise.all([
          this.createOrUpdateComponentTemplate({
            name: SLO_COMPONENT_TEMPLATE_MAPPINGS_NAME,
            ...sloMappingsTemplate,
          }),

          this.createOrUpdateComponentTemplate({
            name: SLO_COMPONENT_TEMPLATE_SETTINGS_NAME,
            ...sloSettingsTemplate,
          }),
        ]);

        await this.createOrUpdateIndexTemplate({
          name: SLO_INDEX_TEMPLATE_NAME,
          ...sloIndexTemplate,
        });
      } catch (err) {
        this.logger.error(`Error installing resources shared for SLO - ${err.message}`);
        throw err;
      }
    });
  }

  private async withTimeout(details: string, installer: () => Promise<void>): Promise<void> {
    try {
      let timeoutId: NodeJS.Timeout;
      const installResources = async (): Promise<void> => {
        this.logger.info(`Installing ${details}`);
        await installer();
        this.logger.info(`Installed ${details}`);

        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };

      const throwTimeoutException = (): Promise<void> => {
        return new Promise((resolve, reject) => {
          timeoutId = setTimeout(() => {
            const msg = `Timeout: it took more than ${this.config.installationTimeout}ms`;
            reject(new Error(msg));
          }, this.config.installationTimeout);
        });
      };

      await Promise.race([installResources(), throwTimeoutException()]);
    } catch (e) {
      this.logger.error(e);

      const reason = e?.message || 'Unknown reason';
      throw new Error(`Failure installing ${details}. ${reason}`);
    }
  }

  private async checkIndexTemplateExists(): Promise<boolean> {
    return this.esClient.indices.existsIndexTemplate({
      name: SLO_INDEX_TEMPLATE_NAME,
    });
  }

  private async createOrUpdateComponentTemplate(template: ClusterPutComponentTemplateRequest) {
    this.logger.debug(`Installing SLO component template ${template.name}`);
    return this.esClient.cluster.putComponentTemplate(template);
  }

  private async createOrUpdateIndexTemplate(template: IndicesPutIndexTemplateRequest) {
    this.logger.debug(`Installing SLO index template ${template.name}`);
    return this.esClient.indices.putIndexTemplate(template);
  }
}
