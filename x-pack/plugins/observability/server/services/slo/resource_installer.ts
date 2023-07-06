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
  SLO_INDEX_TEMPLATE_PATTERN,
  SLO_INGEST_PIPELINE_INDEX_NAME_PREFIX,
  SLO_SUMMARY_INDEX_TEMPLATE_NAME,
  SLO_SUMMARY_COMPONENT_TEMPLATE_MAPPINGS_NAME,
  SLO_SUMMARY_COMPONENT_TEMPLATE_SETTINGS_NAME,
  SLO_SUMMARY_INDEX_TEMPLATE_PATTERN,
} from '../../assets/constants';
import { getSLOMappingsTemplate } from '../../assets/component_templates/slo_mappings_template';
import { getSLOSettingsTemplate } from '../../assets/component_templates/slo_settings_template';
import { getSLOIndexTemplate } from '../../assets/index_templates/slo_index_templates';
import { getSLOPipelineTemplate } from '../../assets/ingest_templates/slo_pipeline_template';
import { getSLOSummaryMappingsTemplate } from '../../assets/component_templates/slo_summary_mappings_template';
import { getSLOSummarySettingsTemplate } from '../../assets/component_templates/slo_summary_settings_template';
import { getSLOSummaryIndexTemplate } from '../../assets/index_templates/slo_summary_index_templates';

export interface ResourceInstaller {
  ensureCommonResourcesInstalled(): Promise<void>;
}

export class DefaultResourceInstaller implements ResourceInstaller {
  constructor(private esClient: ElasticsearchClient, private logger: Logger) {}

  public async ensureCommonResourcesInstalled(): Promise<void> {
    const alreadyInstalled = await this.areResourcesAlreadyInstalled();

    if (alreadyInstalled) {
      this.logger.debug('SLO resources already installed - skipping.');
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

      await this.createOrUpdateIngestPipelineTemplate(
        getSLOPipelineTemplate(SLO_INGEST_PIPELINE_NAME, SLO_INGEST_PIPELINE_INDEX_NAME_PREFIX)
      );
    } catch (err) {
      this.logger.error(`Error installing resources shared for SLO: ${err.message}`);
      throw err;
    }
  }

  private async areResourcesAlreadyInstalled(): Promise<boolean> {
    let indexTemplateExists = false;
    try {
      const { index_templates: indexTemplates } = await this.esClient.indices.getIndexTemplate({
        name: SLO_INDEX_TEMPLATE_NAME,
      });
      const sloIndexTemplate = indexTemplates.find(
        (template) => template.name === SLO_INDEX_TEMPLATE_NAME
      );
      indexTemplateExists =
        !!sloIndexTemplate &&
        sloIndexTemplate.index_template._meta?.version === SLO_RESOURCES_VERSION;
    } catch (err) {
      return false;
    }

    let summaryIndexTemplateExists = false;
    try {
      const { index_templates: indexTemplates } = await this.esClient.indices.getIndexTemplate({
        name: SLO_SUMMARY_INDEX_TEMPLATE_NAME,
      });
      const sloSummaryIndexTemplate = indexTemplates.find(
        (template) => template.name === SLO_SUMMARY_INDEX_TEMPLATE_NAME
      );
      summaryIndexTemplateExists =
        !!sloSummaryIndexTemplate &&
        sloSummaryIndexTemplate.index_template._meta?.version === SLO_RESOURCES_VERSION;
    } catch (err) {
      return false;
    }

    let ingestPipelineExists = false;
    try {
      const pipeline = await this.esClient.ingest.getPipeline({ id: SLO_INGEST_PIPELINE_NAME });

      ingestPipelineExists =
        // @ts-ignore _meta is not defined on the type
        pipeline && pipeline[SLO_INGEST_PIPELINE_NAME]._meta.version === SLO_RESOURCES_VERSION;
    } catch (err) {
      return false;
    }

    return indexTemplateExists && summaryIndexTemplateExists && ingestPipelineExists;
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
