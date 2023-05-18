/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepEqual from 'fast-deep-equal';
import { ElasticsearchClient } from '@kbn/core/server';
import { UpdateSLOParams, UpdateSLOResponse, updateSLOResponseSchema } from '@kbn/slo-schema';

import { SLO_INDEX_TEMPLATE_NAME, SLO_SUMMARY_INDEX_TEMPLATE_NAME } from '../../assets/constants';
import { SLORepository } from './slo_repository';
import { TransformManager } from './transform_manager';
import { SLO } from '../../domain/models';
import { validateSLO } from '../../domain/services';

export class UpdateSLO {
  constructor(
    private repository: SLORepository,
    private transformManager: TransformManager,
    private esClient: ElasticsearchClient
  ) {}

  public async execute(sloId: string, params: UpdateSLOParams): Promise<UpdateSLOResponse> {
    const originalSlo = await this.repository.findById(sloId);
    const { hasBreakingChange, updatedSlo } = this.updateSLO(originalSlo, params);

    if (hasBreakingChange) {
      await this.manageObsoleteData(originalSlo);

      await this.repository.save(updatedSlo);
      await this.transformManager.install(updatedSlo);
      await this.transformManager.start(updatedSlo);
    } else {
      await this.repository.save(updatedSlo);
    }

    return this.toResponse(updatedSlo);
  }

  private updateSLO(originalSlo: SLO, params: UpdateSLOParams) {
    let hasBreakingChange = false;
    const updatedSlo: SLO = Object.assign({}, originalSlo, params, { updatedAt: new Date() });
    validateSLO(updatedSlo);

    if (
      !deepEqual(originalSlo.indicator, updatedSlo.indicator) ||
      !deepEqual(originalSlo.timeWindow, updatedSlo.timeWindow) ||
      originalSlo.budgetingMethod !== updatedSlo.budgetingMethod ||
      !deepEqual(originalSlo.objective, updatedSlo.objective) ||
      !deepEqual(originalSlo.settings, updatedSlo.settings)
    ) {
      hasBreakingChange = true;
    }

    if (hasBreakingChange) {
      updatedSlo.revision++;
    }

    return { hasBreakingChange, updatedSlo };
  }

  private async manageObsoleteData(originalSlo: SLO) {
    await this.transformManager.stop(originalSlo);
    await this.transformManager.uninstall(originalSlo);
    await this.deleteRollupAndSummaryData(originalSlo);
  }

  private async deleteRollupAndSummaryData(slo: SLO): Promise<void> {
    await this.esClient.deleteByQuery({
      index: `${SLO_INDEX_TEMPLATE_NAME}*`,
      wait_for_completion: false,
      query: {
        bool: {
          filter: [{ term: { 'slo.id': slo.id } }, { term: { 'slo.revision': slo.revision } }],
        },
      },
    });

    await this.esClient.deleteByQuery({
      index: `${SLO_SUMMARY_INDEX_TEMPLATE_NAME}*`,
      wait_for_completion: false,
      query: {
        bool: {
          filter: [{ term: { 'slo.id': slo.id } }, { term: { 'slo.revision': slo.revision } }],
        },
      },
    });
  }

  private toResponse(slo: SLO): UpdateSLOResponse {
    return updateSLOResponseSchema.encode(slo);
  }
}
