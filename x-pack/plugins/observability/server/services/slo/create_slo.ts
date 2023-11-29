/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { ALL_VALUE, CreateSLOParams, CreateSLOResponse } from '@kbn/slo-schema';
import { v4 as uuidv4 } from 'uuid';
import { SLO_MODEL_VERSION, SLO_SUMMARY_TEMP_INDEX_NAME } from '../../assets/constants';
import { getSLOSummaryPipelineTemplate } from '../../assets/ingest_templates/slo_summary_pipeline_template';
import { Duration, DurationUnit, SLO } from '../../domain/models';
import { validateSLO } from '../../domain/services';
import { SLORepository } from './slo_repository';
import { createTempSummaryDocument } from './summary_transform_generator/helpers/create_temp_summary';
import { TransformManager } from './transform_manager';

export class CreateSLO {
  constructor(
    private esClient: ElasticsearchClient,
    private repository: SLORepository,
    private transformManager: TransformManager,
    private summaryTransformManager: TransformManager
  ) {}

  public async execute(params: CreateSLOParams): Promise<CreateSLOResponse> {
    const slo = this.toSLO(params);
    validateSLO(slo);

    await this.repository.save(slo, { throwOnConflict: true });
    let transformId;
    try {
      transformId = await this.transformManager.install(slo);
    } catch (err) {
      await this.repository.deleteById(slo.id);
      throw err;
    }

    try {
      await this.transformManager.start(transformId);
    } catch (err) {
      await Promise.all([
        this.transformManager.uninstall(transformId),
        this.repository.deleteById(slo.id),
      ]);

      throw err;
    }

    await this.esClient.ingest.putPipeline(getSLOSummaryPipelineTemplate(slo));

    let summaryTransformId;
    try {
      summaryTransformId = await this.summaryTransformManager.install(slo);
    } catch (err) {
      // handle rollback
      throw err;
    }

    try {
      await this.transformManager.start(summaryTransformId);
    } catch (err) {
      // handle rollback
      await Promise.all([this.transformManager.uninstall(summaryTransformId)]);
      throw err;
    }

    await this.esClient.index({
      index: SLO_SUMMARY_TEMP_INDEX_NAME,
      id: `slo-${slo.id}`,
      document: createTempSummaryDocument(slo),
      refresh: true,
    });

    return this.toResponse(slo);
  }

  private toSLO(params: CreateSLOParams): SLO {
    const now = new Date();
    return {
      ...params,
      id: params.id ?? uuidv4(),
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
      version: SLO_MODEL_VERSION,
    };
  }

  private toResponse(slo: SLO): CreateSLOResponse {
    return {
      id: slo.id,
    };
  }
}
