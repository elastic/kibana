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
} from '../../assets/constants';
import { sloMappingsTemplate } from '../../assets/component_templates/slo_mappings_template';
import { sloSettingsTemplate } from '../../assets/component_templates/slo_settings_template';
import { getSloIndexTemplate } from '../../assets/index_templates/slo_index_templates';

export class ResourceInstaller {
  constructor(private esClient: ElasticsearchClient, private logger: Logger) {}

  public async ensureCommonResourcesInstalled(): Promise<void> {
    const existingIndexTemplate = await this.checkIndexTemplateExists();

    if (existingIndexTemplate) {
      this.logger.debug(`Skipping installation of resources shared between all SLO indices`);
      return;
    }

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
        ...getSloIndexTemplate(`${SLO_INDEX_TEMPLATE_NAME}-*`, [
          SLO_COMPONENT_TEMPLATE_MAPPINGS_NAME,
          SLO_COMPONENT_TEMPLATE_SETTINGS_NAME,
        ]),
      });
    } catch (err) {
      this.logger.error(`Error installing resources shared for SLO - ${err.message}`);
      throw err;
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
