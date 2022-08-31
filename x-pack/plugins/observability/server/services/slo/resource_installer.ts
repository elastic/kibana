/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ClusterPutComponentTemplateRequest,
  IndicesPutIndexTemplateRequest,
  IngestPutPipelineRequest,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';

import {
  SLO_COMPONENT_TEMPLATE_MAPPINGS_NAME,
  SLO_COMPONENT_TEMPLATE_SETTINGS_NAME,
  SLO_INDEX_TEMPLATE_NAME,
  SLO_INGEST_PIPELINE_NAME,
} from '../../assets/constants';
import { sloMappingsTemplate } from '../../assets/component_templates/slo_mappings_template';
import { sloSettingsTemplate } from '../../assets/component_templates/slo_settings_template';
import { getSLOIndexTemplate } from '../../assets/index_templates/slo_index_templates';
import { getSLOPipelineTemplate } from '../../assets/ingest_templates/slo_pipeline_template';

export class ResourceInstaller {
  constructor(private esClient: ElasticsearchClient, private logger: Logger) {}

  public async ensureCommonResourcesInstalled(): Promise<void> {
    const alreadyInstalled = await this.areResourcesAlreadyInstalled();

    if (alreadyInstalled) {
      this.logger.debug(
        `Skipping installation of resources shared for SLO since they already exist`
      );
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
        ...getSLOIndexTemplate(`${SLO_INDEX_TEMPLATE_NAME}-*`, [
          SLO_COMPONENT_TEMPLATE_MAPPINGS_NAME,
          SLO_COMPONENT_TEMPLATE_SETTINGS_NAME,
        ]),
      });

      await this.createOrUpdateIngestPipelineTemplate({
        id: SLO_INGEST_PIPELINE_NAME,
        ...getSLOPipelineTemplate(`${SLO_INDEX_TEMPLATE_NAME}-default-`),
      });
    } catch (err) {
      this.logger.error(`Error installing resources shared for SLO - ${err.message}`);
      throw err;
    }
  }

  private async areResourcesAlreadyInstalled(): Promise<boolean> {
    const indexTemplateExists = await this.esClient.indices.existsIndexTemplate({
      name: SLO_INDEX_TEMPLATE_NAME,
    });

    let ingestPipelineExists = false;
    try {
      await this.esClient.ingest.getPipeline({
        id: SLO_INGEST_PIPELINE_NAME,
      });

      ingestPipelineExists = true;
    } catch (err) {
      return false;
    }

    return indexTemplateExists && ingestPipelineExists;
  }

  private async createOrUpdateComponentTemplate(template: ClusterPutComponentTemplateRequest) {
    this.logger.debug(`Installing SLO component template ${template.name}`);
    return this.esClient.cluster.putComponentTemplate(template);
  }

  private async createOrUpdateIndexTemplate(template: IndicesPutIndexTemplateRequest) {
    this.logger.debug(`Installing SLO index template ${template.name}`);
    return this.esClient.indices.putIndexTemplate(template);
  }

  private async createOrUpdateIngestPipelineTemplate(template: IngestPutPipelineRequest) {
    this.logger.debug(`Installing SLO ingest pipeline template ${template.id}`);
    await this.esClient.ingest.putPipeline(template);
  }
}
