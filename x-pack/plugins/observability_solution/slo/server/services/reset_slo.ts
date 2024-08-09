/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, IBasePath, Logger } from '@kbn/core/server';
import { resetSLOResponseSchema } from '@kbn/slo-schema';
import {
  getSLOPipelineId,
  getSLOSummaryPipelineId,
  getSLOSummaryTransformId,
  getSLOTransformId,
  SLO_DESTINATION_INDEX_PATTERN,
  SLO_MODEL_VERSION,
  SLO_SUMMARY_DESTINATION_INDEX_PATTERN,
  SLO_SUMMARY_TEMP_INDEX_NAME,
} from '../../common/constants';
import { getSLOPipelineTemplate } from '../assets/ingest_templates/slo_pipeline_template';
import { getSLOSummaryPipelineTemplate } from '../assets/ingest_templates/slo_summary_pipeline_template';
import { retryTransientEsErrors } from '../utils/retry';
import { SLORepository } from './slo_repository';
import { createTempSummaryDocument } from './summary_transform_generator/helpers/create_temp_summary';
import { TransformManager } from './transform_manager';

export class ResetSLO {
  constructor(
    private esClient: ElasticsearchClient,
    private repository: SLORepository,
    private transformManager: TransformManager,
    private summaryTransformManager: TransformManager,
    private logger: Logger,
    private spaceId: string,
    private basePath: IBasePath
  ) {}

  public async execute(sloId: string) {
    const slo = await this.repository.findById(sloId);

    const summaryTransformId = getSLOSummaryTransformId(slo.id, slo.revision);
    await this.summaryTransformManager.stop(summaryTransformId);
    await this.summaryTransformManager.uninstall(summaryTransformId);

    const rollupTransformId = getSLOTransformId(slo.id, slo.revision);
    await this.transformManager.stop(rollupTransformId);
    await this.transformManager.uninstall(rollupTransformId);

    await Promise.all([this.deleteRollupData(slo.id), this.deleteSummaryData(slo.id)]);

    try {
      await retryTransientEsErrors(
        () => this.esClient.ingest.putPipeline(getSLOPipelineTemplate(slo)),
        { logger: this.logger }
      );

      await this.transformManager.install(slo);
      await this.transformManager.start(rollupTransformId);

      await retryTransientEsErrors(
        () =>
          this.esClient.ingest.putPipeline(
            getSLOSummaryPipelineTemplate(slo, this.spaceId, this.basePath)
          ),
        { logger: this.logger }
      );

      await this.summaryTransformManager.install(slo);
      await this.summaryTransformManager.start(summaryTransformId);

      await retryTransientEsErrors(
        () =>
          this.esClient.index({
            index: SLO_SUMMARY_TEMP_INDEX_NAME,
            id: `slo-${slo.id}`,
            document: createTempSummaryDocument(slo, this.spaceId, this.basePath),
            refresh: true,
          }),
        { logger: this.logger }
      );
    } catch (err) {
      this.logger.error(
        `Cannot reset the SLO [id: ${slo.id}, revision: ${slo.revision}]. Rolling back.`
      );

      await this.summaryTransformManager.stop(summaryTransformId);
      await this.summaryTransformManager.uninstall(summaryTransformId);
      await this.transformManager.stop(rollupTransformId);
      await this.transformManager.uninstall(rollupTransformId);
      await this.esClient.ingest.deletePipeline(
        { id: getSLOSummaryPipelineId(slo.id, slo.revision) },
        { ignore: [404] }
      );

      await this.esClient.ingest.deletePipeline(
        { id: getSLOPipelineId(slo.id, slo.revision) },
        { ignore: [404] }
      );

      throw err;
    }

    const updatedSlo = await this.repository.save({
      ...slo,
      version: SLO_MODEL_VERSION,
      updatedAt: new Date(),
    });

    return resetSLOResponseSchema.encode(updatedSlo);
  }

  /**
   * Deleting all SLI rollup data matching the sloId. All revision will be deleted in case of
   * residual documents.
   *
   * @param sloId
   */
  private async deleteRollupData(sloId: string): Promise<void> {
    await this.esClient.deleteByQuery({
      index: SLO_DESTINATION_INDEX_PATTERN,
      refresh: true,
      query: {
        bool: {
          filter: [{ term: { 'slo.id': sloId } }],
        },
      },
    });
  }

  /**
   * Deleting the summary documents matching the sloId. All revision will be deleted in case of
   * residual documents.
   *
   * @param sloId
   */
  private async deleteSummaryData(sloId: string): Promise<void> {
    await this.esClient.deleteByQuery({
      index: SLO_SUMMARY_DESTINATION_INDEX_PATTERN,
      refresh: true,
      query: {
        bool: {
          filter: [{ term: { 'slo.id': sloId } }],
        },
      },
    });
  }
}
