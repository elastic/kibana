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
import { getSLOMappingsTemplate } from '../../assets/component_templates/slo_mappings_template';
import { getSLOSettingsTemplate } from '../../assets/component_templates/slo_settings_template';
import { getSLOSummaryMappingsTemplate } from '../../assets/component_templates/slo_summary_mappings_template';
import { getSLOSummarySettingsTemplate } from '../../assets/component_templates/slo_summary_settings_template';
import {
  SLO_COMPONENT_TEMPLATE_MAPPINGS_NAME,
  SLO_COMPONENT_TEMPLATE_SETTINGS_NAME,
  SLO_DESTINATION_INDEX_NAME,
  SLO_INDEX_TEMPLATE_NAME,
  SLO_INDEX_TEMPLATE_PATTERN,
  SLO_INGEST_PIPELINE_INDEX_NAME_PREFIX,
  SLO_INGEST_PIPELINE_NAME,
  SLO_SUMMARY_COMPONENT_TEMPLATE_MAPPINGS_NAME,
  SLO_SUMMARY_COMPONENT_TEMPLATE_SETTINGS_NAME,
  SLO_SUMMARY_DESTINATION_INDEX_NAME,
  SLO_SUMMARY_INDEX_TEMPLATE_NAME,
  SLO_SUMMARY_INDEX_TEMPLATE_PATTERN,
  SLO_SUMMARY_TEMP_INDEX_NAME,
} from '../../../common/slo/constants';
import { getSLOIndexTemplate } from '../../assets/index_templates/slo_index_templates';
import { getSLOSummaryIndexTemplate } from '../../assets/index_templates/slo_summary_index_templates';
import { getSLOPipelineTemplate } from '../../assets/ingest_templates/slo_pipeline_template';
import { retryTransientEsErrors } from '../../utils/retry';

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

      await this.createOrUpdateIngestPipelineTemplate(
        getSLOPipelineTemplate(SLO_INGEST_PIPELINE_NAME, SLO_INGEST_PIPELINE_INDEX_NAME_PREFIX)
      );
    } catch (err) {
      this.logger.error(`Error installing resources shared for SLO: ${err.message}`);
      throw err;
    }
  }

  private async createOrUpdateComponentTemplate(template: ClusterPutComponentTemplateRequest) {
    this.logger.info(`Installing SLO component template [${template.name}]`);
    return this.execute(() => this.esClient.cluster.putComponentTemplate(template));
  }

  private async createOrUpdateIndexTemplate(template: IndicesPutIndexTemplateRequest) {
    this.logger.info(`Installing SLO index template [${template.name}]`);
    return this.execute(() => this.esClient.indices.putIndexTemplate(template));
  }

  private async createOrUpdateIngestPipelineTemplate(template: IngestPutPipelineRequest) {
    this.logger.info(`Installing SLO ingest pipeline [${template.id}]`);
    return this.execute(() => this.esClient.ingest.putPipeline(template));
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
