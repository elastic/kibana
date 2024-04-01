/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, IBasePath, Logger } from '@kbn/core/server';
import { UpdateSLOParams, UpdateSLOResponse, updateSLOResponseSchema } from '@kbn/slo-schema';
import { isEqual, pick } from 'lodash';
import {
  getSLOSummaryPipelineId,
  getSLOSummaryTransformId,
  getSLOTransformId,
  SLO_DESTINATION_INDEX_PATTERN,
  SLO_SUMMARY_DESTINATION_INDEX_PATTERN,
  SLO_SUMMARY_TEMP_INDEX_NAME,
} from '../../common/constants';
import { getSLOSummaryPipelineTemplate } from '../assets/ingest_templates/slo_summary_pipeline_template';
import { SLO, SLODefinition } from '../domain/models';
import { validateSLO } from '../domain/services';
import { retryTransientEsErrors } from '../utils/retry';
import { SLORepository } from './slo_repository';
import { createTempSummaryDocument } from './summary_transform_generator/helpers/create_temp_summary';
import { TransformManager } from './transform_manager';

export class UpdateSLO {
  constructor(
    private repository: SLORepository,
    private transformManager: TransformManager,
    private summaryTransformManager: TransformManager,
    private esClient: ElasticsearchClient,
    private logger: Logger,
    private spaceId: string,
    private basePath: IBasePath
  ) {}

  public async execute(sloId: string, params: UpdateSLOParams): Promise<UpdateSLOResponse> {
    const originalSlo = await this.repository.findById(sloId);
    let updatedSlo: SLO = Object.assign({}, originalSlo, params, {
      groupBy: !!params.groupBy ? params.groupBy : originalSlo.groupBy,
    });

    if (isEqual(originalSlo, updatedSlo)) {
      return this.toResponse(originalSlo);
    }

    const fields = [
      'indicator',
      'groupBy',
      'timeWindow',
      'objective',
      'budgetingMethod',
      'settings',
    ];
    const requireRevisionBump = !isEqual(pick(originalSlo, fields), pick(updatedSlo, fields));

    updatedSlo = Object.assign(updatedSlo, {
      updatedAt: new Date(),
      revision: requireRevisionBump ? originalSlo.revision + 1 : originalSlo.revision,
    });

    validateSLO(updatedSlo);
    await this.repository.save(updatedSlo);

    if (!requireRevisionBump) {
      // At this point, we still need to update the summary pipeline to include the changes (name, desc, tags, ...) in the summary index
      await retryTransientEsErrors(
        () =>
          this.esClient.ingest.putPipeline(
            getSLOSummaryPipelineTemplate(updatedSlo, this.spaceId, this.basePath)
          ),
        { logger: this.logger }
      );

      return this.toResponse(updatedSlo);
    }

    const updatedRollupTransformId = getSLOTransformId(updatedSlo.id, updatedSlo.revision);
    const updatedSummaryTransformId = getSLOSummaryTransformId(updatedSlo.id, updatedSlo.revision);

    try {
      await this.transformManager.install(updatedSlo);
      await this.transformManager.start(updatedRollupTransformId);

      await retryTransientEsErrors(
        () =>
          this.esClient.ingest.putPipeline(
            getSLOSummaryPipelineTemplate(updatedSlo, this.spaceId, this.basePath)
          ),
        { logger: this.logger }
      );

      await this.summaryTransformManager.install(updatedSlo);
      await this.summaryTransformManager.start(updatedSummaryTransformId);

      await retryTransientEsErrors(
        () =>
          this.esClient.index({
            index: SLO_SUMMARY_TEMP_INDEX_NAME,
            id: `slo-${updatedSlo.id}`,
            document: createTempSummaryDocument(updatedSlo, this.spaceId),
            refresh: true,
          }),
        { logger: this.logger }
      );
    } catch (err) {
      this.logger.error(
        `Cannot update the SLO [id: ${updatedSlo.id}, revision: ${updatedSlo.revision}]. Rolling back.`
      );

      // Restore the previous slo definition
      await this.repository.save(originalSlo);
      // delete the created resources for the updated slo
      await this.summaryTransformManager.stop(updatedSummaryTransformId);
      await this.summaryTransformManager.uninstall(updatedSummaryTransformId);
      await this.transformManager.stop(updatedRollupTransformId);
      await this.transformManager.uninstall(updatedRollupTransformId);
      await this.esClient.ingest.deletePipeline(
        { id: getSLOSummaryPipelineId(updatedSlo.id, updatedSlo.revision) },
        { ignore: [404] }
      );

      throw err;
    }

    await this.deleteOriginalSLO(originalSlo);

    return this.toResponse(updatedSlo);
  }

  private async deleteOriginalSLO(originalSlo: SLO) {
    try {
      const originalRollupTransformId = getSLOTransformId(originalSlo.id, originalSlo.revision);
      await this.transformManager.stop(originalRollupTransformId);
      await this.transformManager.uninstall(originalRollupTransformId);

      const originalSummaryTransformId = getSLOSummaryTransformId(
        originalSlo.id,
        originalSlo.revision
      );
      await this.summaryTransformManager.stop(originalSummaryTransformId);
      await this.summaryTransformManager.uninstall(originalSummaryTransformId);

      await this.esClient.ingest.deletePipeline(
        { id: getSLOSummaryPipelineId(originalSlo.id, originalSlo.revision) },
        { ignore: [404] }
      );
    } catch (err) {
      // Any errors here should not prevent moving forward.
      // Worst case we keep rolling up data for the previous revision number.
    }

    await this.deleteRollupData(originalSlo.id, originalSlo.revision);
    await this.deleteSummaryData(originalSlo.id, originalSlo.revision);
  }

  private async deleteRollupData(sloId: string, sloRevision: number): Promise<void> {
    await this.esClient.deleteByQuery({
      index: SLO_DESTINATION_INDEX_PATTERN,
      wait_for_completion: false,
      query: {
        bool: {
          filter: [{ term: { 'slo.id': sloId } }, { term: { 'slo.revision': sloRevision } }],
        },
      },
    });
  }

  private async deleteSummaryData(sloId: string, sloRevision: number): Promise<void> {
    await this.esClient.deleteByQuery({
      index: SLO_SUMMARY_DESTINATION_INDEX_PATTERN,
      refresh: true,
      query: {
        bool: {
          filter: [{ term: { 'slo.id': sloId } }, { term: { 'slo.revision': sloRevision } }],
        },
      },
    });
  }

  private toResponse(slo: SLODefinition): UpdateSLOResponse {
    return updateSLOResponseSchema.encode(slo);
  }
}
