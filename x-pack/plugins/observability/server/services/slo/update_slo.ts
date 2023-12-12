/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { UpdateSLOParams, UpdateSLOResponse, updateSLOResponseSchema } from '@kbn/slo-schema';
import { isEqual } from 'lodash';
import {
  getSLOTransformId,
  SLO_DESTINATION_INDEX_PATTERN,
  SLO_SUMMARY_DESTINATION_INDEX_PATTERN,
  SLO_SUMMARY_TEMP_INDEX_NAME,
} from '../../../common/slo/constants';
import { SLO } from '../../domain/models';
import { validateSLO } from '../../domain/services';
import { SLORepository } from './slo_repository';
import { createTempSummaryDocument } from './summary_transform/helpers/create_temp_summary';
import { TransformManager } from './transform_manager';

export class UpdateSLO {
  constructor(
    private repository: SLORepository,
    private transformManager: TransformManager,
    private esClient: ElasticsearchClient
  ) {}

  public async execute(sloId: string, params: UpdateSLOParams): Promise<UpdateSLOResponse> {
    const originalSlo = await this.repository.findById(sloId);
    let updatedSlo: SLO = Object.assign({}, originalSlo, params, {
      groupBy: !!params.groupBy ? params.groupBy : originalSlo.groupBy,
    });

    if (isEqual(originalSlo, updatedSlo)) {
      return this.toResponse(originalSlo);
    }

    updatedSlo = Object.assign(updatedSlo, {
      updatedAt: new Date(),
      revision: originalSlo.revision + 1,
    });

    validateSLO(updatedSlo);

    const updatedSloTransformId = getSLOTransformId(updatedSlo.id, updatedSlo.revision);
    await this.repository.save(updatedSlo);

    try {
      await this.transformManager.install(updatedSlo);
    } catch (err) {
      await this.repository.save(originalSlo);
      throw err;
    }

    try {
      await this.transformManager.preview(updatedSloTransformId);
      await this.transformManager.start(updatedSloTransformId);
    } catch (err) {
      await Promise.all([
        this.transformManager.uninstall(updatedSloTransformId),
        this.repository.save(originalSlo),
      ]);

      throw err;
    }

    await this.esClient.index({
      index: SLO_SUMMARY_TEMP_INDEX_NAME,
      id: `slo-${updatedSlo.id}`,
      document: createTempSummaryDocument(updatedSlo),
      refresh: true,
    });

    await this.deleteOriginalSLO(originalSlo);

    return this.toResponse(updatedSlo);
  }

  private async deleteOriginalSLO(originalSlo: SLO) {
    try {
      const originalSloTransformId = getSLOTransformId(originalSlo.id, originalSlo.revision);
      await this.transformManager.stop(originalSloTransformId);
      await this.transformManager.uninstall(originalSloTransformId);
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

  private toResponse(slo: SLO): UpdateSLOResponse {
    return updateSLOResponseSchema.encode(slo);
  }
}
