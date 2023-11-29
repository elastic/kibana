/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { ALL_VALUE, CreateSLOParams, CreateSLOResponse } from '@kbn/slo-schema';
import { v4 as uuidv4 } from 'uuid';
import {
  getSLOSummaryPipelineId,
  getSLOSummaryTransformId,
  getSLOTransformId,
  SLO_MODEL_VERSION,
  SLO_SUMMARY_TEMP_INDEX_NAME,
} from '../../assets/constants';
import { getSLOSummaryPipelineTemplate } from '../../assets/ingest_templates/slo_summary_pipeline_template';
import { Duration, DurationUnit, SLO } from '../../domain/models';
import { validateSLO } from '../../domain/services';
import { retryTransientEsErrors } from '../../utils/retry';
import { SLORepository } from './slo_repository';
import { createTempSummaryDocument } from './summary_transform_generator/helpers/create_temp_summary';
import { TransformManager } from './transform_manager';

export class CreateSLO {
  constructor(
    private esClient: ElasticsearchClient,
    private repository: SLORepository,
    private transformManager: TransformManager,
    private summaryTransformManager: TransformManager,
    private logger: Logger
  ) {}

  public async execute(params: CreateSLOParams): Promise<CreateSLOResponse> {
    const slo = this.toSLO(params);
    validateSLO(slo);

    await this.repository.save(slo, { throwOnConflict: true });

    const rollupTransformId = getSLOTransformId(slo.id, slo.revision);
    const summaryTransformId = getSLOSummaryTransformId(slo.id, slo.revision);

    try {
      await this.transformManager.install(slo);
    } catch (err) {
      this.logger.error(
        `Cannot install rollup transform for SLO [id: ${slo.id}, revision: ${slo.revision}]`
      );
      await this.repository.deleteById(slo.id);
      throw err;
    }

    try {
      await this.transformManager.start(rollupTransformId);
    } catch (err) {
      this.logger.error(
        `Cannot start rollup transform for SLO [id: ${slo.id}, revision: ${slo.revision}]`
      );
      await Promise.all([
        this.transformManager.uninstall(rollupTransformId),
        this.repository.deleteById(slo.id),
      ]);

      throw err;
    }

    try {
      await retryTransientEsErrors(
        () => this.esClient.ingest.putPipeline(getSLOSummaryPipelineTemplate(slo)),
        { logger: this.logger }
      );
    } catch (err) {
      this.logger.error(
        `Cannot create summary pipeline for SLO [id: ${slo.id}, revision: ${slo.revision}]`
      );

      await this.transformManager.stop(rollupTransformId);
      await Promise.all([
        this.transformManager.uninstall(rollupTransformId),
        this.repository.deleteById(slo.id),
      ]);

      throw err;
    }

    try {
      await this.summaryTransformManager.install(slo);
    } catch (err) {
      this.logger.error(
        `Cannot create summary transform for SLO [id: ${slo.id}, revision: ${slo.revision}]`
      );

      await this.transformManager.stop(rollupTransformId);
      await Promise.all([
        this.esClient.ingest.deletePipeline({ id: getSLOSummaryPipelineId(slo.id, slo.revision) }),
        this.transformManager.uninstall(rollupTransformId),
        this.repository.deleteById(slo.id),
      ]);
      throw err;
    }

    try {
      await this.summaryTransformManager.start(summaryTransformId);
    } catch (err) {
      this.logger.error(
        `Cannot start summary transform for SLO [id: ${slo.id}, revision: ${slo.revision}]`
      );

      await Promise.all([
        await this.summaryTransformManager.uninstall(summaryTransformId),
        await this.transformManager.stop(rollupTransformId),
      ]);
      await Promise.all([
        this.esClient.ingest.deletePipeline({ id: getSLOSummaryPipelineId(slo.id, slo.revision) }),
        this.transformManager.uninstall(rollupTransformId),
        this.repository.deleteById(slo.id),
      ]);
      throw err;
    }

    await retryTransientEsErrors(
      () =>
        this.esClient.index({
          index: SLO_SUMMARY_TEMP_INDEX_NAME,
          id: `slo-${slo.id}`,
          document: createTempSummaryDocument(slo),
          refresh: true,
        }),
      { logger: this.logger }
    );

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
