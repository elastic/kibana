/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { getSLOTransformId, SLO_INDEX_TEMPLATE_NAME } from '../../assets/constants';

import { SLORepository } from './slo_repository';
import { TransformManager } from './transform_manager';

export class DeleteSLO {
  constructor(
    private repository: SLORepository,
    private transformManager: TransformManager,
    private esClient: ElasticsearchClient
  ) {}

  public async execute(sloId: string): Promise<void> {
    // ensure the slo exists on the request's space.
    await this.repository.findById(sloId);

    const sloTransformId = getSLOTransformId(sloId);
    await this.transformManager.stop(sloTransformId);
    await this.transformManager.uninstall(sloTransformId);

    await this.deleteRollupData(sloId);
    await this.repository.deleteById(sloId);
  }

  private async deleteRollupData(sloId: string): Promise<void> {
    await this.esClient.deleteByQuery({
      index: `${SLO_INDEX_TEMPLATE_NAME}*`,
      wait_for_completion: false,
      query: {
        match: {
          'slo.id': sloId,
        },
      },
    });
  }
}
