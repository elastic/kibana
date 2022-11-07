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
  SLO_INGEST_PIPELINE_NAME,
  SLO_COMPONENT_TEMPLATE_MAPPINGS_NAME,
  SLO_COMPONENT_TEMPLATE_SETTINGS_NAME,
  SLO_INDEX_TEMPLATE_NAME,
  SLO_RESOURCES_VERSION,
} from '../../assets/constants';
import { getSLOMappingsTemplate } from '../../assets/component_templates/slo_mappings_template';
import { getSLOSettingsTemplate } from '../../assets/component_templates/slo_settings_template';
import { getSLOIndexTemplate } from '../../assets/index_templates/slo_index_templates';
import { getSLOPipelineTemplate } from '../../assets/ingest_templates/slo_pipeline_template';

export interface ResourceInstaller {
  ensureCommonResourcesInstalled(): Promise<void>;
}

export class DefaultResourceInstaller implements ResourceInstaller {
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
        this.createOrUpdateComponentTemplate(
          getSLOMappingsTemplate(SLO_COMPONENT_TEMPLATE_MAPPINGS_NAME)
        ),
        this.createOrUpdateComponentTemplate(
          getSLOSettingsTemplate(SLO_COMPONENT_TEMPLATE_SETTINGS_NAME)
        ),
      ]);

      await this.createOrUpdateIndexTemplate(
        getSLOIndexTemplate(SLO_INDEX_TEMPLATE_NAME, `${SLO_INDEX_TEMPLATE_NAME}-*`, [
          SLO_COMPONENT_TEMPLATE_MAPPINGS_NAME,
          SLO_COMPONENT_TEMPLATE_SETTINGS_NAME,
        ])
      );

      await this.createOrUpdateIngestPipelineTemplate(
        getSLOPipelineTemplate(
          SLO_INGEST_PIPELINE_NAME,
          this.getPipelinePrefix(SLO_RESOURCES_VERSION)
        )
      );
    } catch (err) {
      this.logger.error(`Error installing resources shared for SLO - ${err.message}`);
      throw err;
    }
  }

  private getPipelinePrefix(version: number): string {
    // Following https://www.elastic.co/blog/an-introduction-to-the-elastic-data-stream-naming-scheme
    // slo-observability.sli-<version>.<index-date>
    return `${SLO_INDEX_TEMPLATE_NAME}-v${version}.`;
  }

  private async areResourcesAlreadyInstalled(): Promise<boolean> {
    const indexTemplateExists = await this.esClient.indices.existsIndexTemplate({
      name: SLO_INDEX_TEMPLATE_NAME,
    });

    let ingestPipelineExists = false;
    try {
      const pipeline = await this.esClient.ingest.getPipeline({ id: SLO_INGEST_PIPELINE_NAME });

      ingestPipelineExists =
        // @ts-ignore _meta is not defined on the type
        pipeline && pipeline[SLO_INGEST_PIPELINE_NAME]._meta.version === SLO_RESOURCES_VERSION;
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
