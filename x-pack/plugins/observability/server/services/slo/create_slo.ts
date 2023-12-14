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
} from '../../../common/slo/constants';
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
    private logger: Logger,
    private spaceId: string
  ) {}

  public async execute(params: CreateSLOParams): Promise<CreateSLOResponse> {
    const slo = this.toSLO(params);
    validateSLO(slo);

    const savedSlo = await this.repository.save(slo, { throwOnConflict: true });

    const rollupTransformId = getSLOTransformId(savedSlo.id, savedSlo.revision);
    const summaryTransformId = getSLOSummaryTransformId(savedSlo.id, savedSlo.revision);
    try {
      await this.transformManager.install(savedSlo);
      await this.transformManager.start(rollupTransformId);
      await retryTransientEsErrors(
        () =>
          this.esClient.ingest.putPipeline(getSLOSummaryPipelineTemplate(savedSlo, this.spaceId)),
        { logger: this.logger }
      );

      await this.summaryTransformManager.install(savedSlo);
      await this.summaryTransformManager.start(summaryTransformId);

      await retryTransientEsErrors(
        () =>
          this.esClient.index({
            index: SLO_SUMMARY_TEMP_INDEX_NAME,
            id: `savedSlo-${savedSlo.id}`,
            document: createTempSummaryDocument(savedSlo, this.spaceId),
            refresh: true,
          }),
        { logger: this.logger }
      );
    } catch (err) {
      this.logger.error(
        `Cannot install the SLO [id: ${savedSlo.id}, revision: ${savedSlo.revision}]. Rolling back.`
      );

      await this.summaryTransformManager.stop(summaryTransformId);
      await this.summaryTransformManager.uninstall(summaryTransformId);
      await this.transformManager.stop(rollupTransformId);
      await this.transformManager.uninstall(rollupTransformId);
      await this.esClient.ingest.deletePipeline(
        { id: getSLOSummaryPipelineId(savedSlo.id, savedSlo.revision) },
        { ignore: [404] }
      );
      await this.repository.deleteById(savedSlo.id);

      throw err;
    }

    return this.toResponse(savedSlo);
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
