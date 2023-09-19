/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { ALL_VALUE, CreateSLOParams, CreateSLOResponse } from '@kbn/slo-schema';
import { v1 as uuidv1 } from 'uuid';
import { SLO_SUMMARY_TEMP_INDEX_NAME } from '../../assets/constants';
import { Duration, DurationUnit, SLO } from '../../domain/models';
import { validateSLO } from '../../domain/services';
import { SLORepository } from './slo_repository';
import { createTempSummaryDocument } from './summary_transform/helpers/create_temp_summary';
import { TransformManager } from './transform_manager';

export class CreateSLO {
  constructor(
    private esClient: ElasticsearchClient,
    private repository: SLORepository,
    private transformManager: TransformManager
  ) {}

  public async execute(params: CreateSLOParams): Promise<CreateSLOResponse> {
    const slo = this.toSLO(params);
    validateSLO(slo);

    await this.repository.save(slo, { throwOnConflict: true });
    let sloTransformId;
    try {
      sloTransformId = await this.transformManager.install(slo);
    } catch (err) {
      await this.repository.deleteById(slo.id);
      throw err;
    }

    try {
      await this.transformManager.start(sloTransformId);
    } catch (err) {
      await Promise.all([
        this.transformManager.uninstall(sloTransformId),
        this.repository.deleteById(slo.id),
      ]);

      throw err;
    }

    await this.esClient.index({
      index: SLO_SUMMARY_TEMP_INDEX_NAME,
      id: `slo-${slo.id}`,
      document: createTempSummaryDocument(slo),
    });

    return this.toResponse(slo);
  }

  private toSLO(params: CreateSLOParams): SLO {
    const now = new Date();
    return {
      ...params,
      id: params.id ?? uuidv1(),
      settings: {
        syncDelay: params.settings?.syncDelay ?? new Duration(1, DurationUnit.Minute),
        frequency: params.settings?.frequency ?? new Duration(1, DurationUnit.Minute),
      },
      revision: 1,
      enabled: true,
      tags: params.tags ?? [],
      createdAt: now,
      updatedAt: now,
      groupBy: !!params.groupBy ? params.groupBy : ALL_VALUE,
    };
  }

  private toResponse(slo: SLO): CreateSLOResponse {
    return {
      id: slo.id,
    };
  }
}
