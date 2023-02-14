/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepEqual from 'fast-deep-equal';
import merge from 'lodash/merge';
import { ElasticsearchClient } from '@kbn/core/server';
import { UpdateSLOParams, UpdateSLOResponse, updateSLOResponseSchema } from '@kbn/slo-schema';

import { getSLOTransformId, SLO_INDEX_TEMPLATE_NAME } from '../../assets/constants';
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
      await this.deleteObsoleteSLORevisionData(originalSlo);

      await this.repository.save(updatedSlo);
      await this.transformManager.install(updatedSlo);
      await this.transformManager.start(getSLOTransformId(updatedSlo.id, updatedSlo.revision));
    } else {
      await this.repository.save(updatedSlo);
    }

    return this.toResponse(updatedSlo);
  }

  private updateSLO(originalSlo: SLO, params: UpdateSLOParams) {
    let hasBreakingChange = false;
    const updatedSlo: SLO = merge({}, originalSlo, params, { updatedAt: new Date() });
    validateSLO(updatedSlo);

    if (!deepEqual(originalSlo.indicator, updatedSlo.indicator)) {
      hasBreakingChange = true;
    }

    if (originalSlo.budgetingMethod !== updatedSlo.budgetingMethod) {
      hasBreakingChange = true;
    }

    if (
      originalSlo.budgetingMethod === 'timeslices' &&
      updatedSlo.budgetingMethod === 'timeslices' &&
      (originalSlo.objective.timesliceTarget !== updatedSlo.objective.timesliceTarget ||
        !deepEqual(originalSlo.objective.timesliceWindow, updatedSlo.objective.timesliceWindow))
    ) {
      hasBreakingChange = true;
    }

    if (!deepEqual(originalSlo.settings, updatedSlo.settings)) {
      hasBreakingChange = true;
    }

    if (hasBreakingChange) {
      updatedSlo.revision++;
    }

    return { hasBreakingChange, updatedSlo };
  }

  private async deleteObsoleteSLORevisionData(originalSlo: SLO) {
    const originalSloTransformId = getSLOTransformId(originalSlo.id, originalSlo.revision);
    await this.transformManager.stop(originalSloTransformId);
    await this.transformManager.uninstall(originalSloTransformId);
    await this.deleteRollupData(originalSlo.id, originalSlo.revision);
  }

  private async deleteRollupData(sloId: string, sloRevision: number): Promise<void> {
    await this.esClient.deleteByQuery({
      index: `${SLO_INDEX_TEMPLATE_NAME}*`,
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
