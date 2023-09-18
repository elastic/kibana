/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { UpdateSLOParams, UpdateSLOResponse, updateSLOResponseSchema } from '@kbn/slo-schema';
import {
  getSLOTransformId,
  SLO_DESTINATION_INDEX_PATTERN,
  SLO_SUMMARY_DESTINATION_INDEX_PATTERN,
  SLO_SUMMARY_TEMP_INDEX_NAME,
} from '../../assets/constants';
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
    const updatedSlo: SLO = Object.assign({}, originalSlo, params, {
      updatedAt: new Date(),
      revision: originalSlo.revision + 1,
      groupBy: !!params.groupBy ? params.groupBy : originalSlo.groupBy,
    });

    validateSLO(updatedSlo);

    await this.deleteObsoleteSLORevisionData(originalSlo);
    await this.repository.save(updatedSlo);
    await this.transformManager.install(updatedSlo);
    await this.transformManager.start(getSLOTransformId(updatedSlo.id, updatedSlo.revision));

    await this.esClient.index({
      index: SLO_SUMMARY_TEMP_INDEX_NAME,
      id: `slo-${updatedSlo.id}`,
      document: createTempSummaryDocument(updatedSlo),
    });

    return this.toResponse(updatedSlo);
  }

  private async deleteObsoleteSLORevisionData(originalSlo: SLO) {
    const originalSloTransformId = getSLOTransformId(originalSlo.id, originalSlo.revision);
    await this.transformManager.stop(originalSloTransformId);
    await this.transformManager.uninstall(originalSloTransformId);
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
      wait_for_completion: false,
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
