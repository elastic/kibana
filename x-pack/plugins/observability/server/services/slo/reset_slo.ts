/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { resetSLOResponseSchema } from '@kbn/slo-schema';
import {
  getSLOTransformId,
  SLO_DESTINATION_INDEX_PATTERN,
  SLO_MODEL_VERSION,
  SLO_SUMMARY_DESTINATION_INDEX_PATTERN,
  SLO_SUMMARY_TEMP_INDEX_NAME,
} from '../../assets/constants';
import { SLORepository } from './slo_repository';
import { createTempSummaryDocument } from './summary_transform/helpers/create_temp_summary';
import { TransformManager } from './transform_manager';

export class ResetSLO {
  constructor(
    private esClient: ElasticsearchClient,
    private repository: SLORepository,
    private transformManager: TransformManager
  ) {}

  public async execute(sloId: string) {
    const slo = await this.repository.findById(sloId);

    const transformId = getSLOTransformId(slo.id, slo.revision);
    await this.transformManager.stop(transformId);
    await this.transformManager.uninstall(transformId);

    await Promise.all([this.deleteRollupData(slo.id), this.deleteSummaryData(slo.id)]);

    await this.transformManager.install(slo);

    try {
      await this.transformManager.preview(transformId);
      await this.transformManager.start(transformId);
    } catch (err) {
      await this.transformManager.uninstall(transformId);
      throw err;
    }

    await this.esClient.index({
      index: SLO_SUMMARY_TEMP_INDEX_NAME,
      id: `slo-${slo.id}`,
      document: createTempSummaryDocument(slo),
      refresh: true,
    });

    const updatedSlo = await this.repository.save(
      Object.assign({ ...slo, version: SLO_MODEL_VERSION, updatedAt: new Date() })
    );

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
