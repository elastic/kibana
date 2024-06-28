/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ElasticsearchClient, IBasePath, Logger } from '@kbn/core/server';
import { ALL_VALUE, CreateSLOParams, CreateSLOResponse } from '@kbn/slo-schema';
import { asyncForEach } from '@kbn/std';
import { v4 as uuidv4 } from 'uuid';
import {
  getSLOSummaryPipelineId,
  getSLOSummaryTransformId,
  getSLOTransformId,
  SLO_MODEL_VERSION,
  SLO_SUMMARY_TEMP_INDEX_NAME,
} from '../../common/constants';
import { getSLOSummaryPipelineTemplate } from '../assets/ingest_templates/slo_summary_pipeline_template';
import { Duration, DurationUnit, SLODefinition } from '../domain/models';
import { validateSLO } from '../domain/services';
import { SecurityException } from '../errors';
import { retryTransientEsErrors } from '../utils/retry';
import { SLORepository } from './slo_repository';
import { createTempSummaryDocument } from './summary_transform_generator/helpers/create_temp_summary';
import { TransformManager } from './transform_manager';
import { getTransformQueryComposite } from './utils/get_transform_compite_query';

export class CreateSLO {
  constructor(
    private esClient: ElasticsearchClient,
    private repository: SLORepository,
    private transformManager: TransformManager,
    private summaryTransformManager: TransformManager,
    private logger: Logger,
    private spaceId: string,
    private basePath: IBasePath
  ) {}

  public async execute(params: CreateSLOParams): Promise<CreateSLOResponse> {
    const slo = this.toSLO(params);
    validateSLO(slo);

    const rollbackOperations = [];

    await this.repository.save(slo, { throwOnConflict: true });
    rollbackOperations.push(() => this.repository.deleteById(slo.id));

    const rollupTransformId = getSLOTransformId(slo.id, slo.revision);
    const summaryTransformId = getSLOSummaryTransformId(slo.id, slo.revision);
    try {
      await this.transformManager.install(slo);
      rollbackOperations.push(() => this.transformManager.uninstall(rollupTransformId));

      await this.transformManager.start(rollupTransformId);
      rollbackOperations.push(() => this.transformManager.stop(rollupTransformId));

      await retryTransientEsErrors(
        () =>
          this.esClient.ingest.putPipeline(
            getSLOSummaryPipelineTemplate(slo, this.spaceId, this.basePath)
          ),
        { logger: this.logger }
      );
      rollbackOperations.push(() =>
        this.esClient.ingest.deletePipeline(
          { id: getSLOSummaryPipelineId(slo.id, slo.revision) },
          { ignore: [404] }
        )
      );

      await this.summaryTransformManager.install(slo);
      rollbackOperations.push(() => this.summaryTransformManager.uninstall(summaryTransformId));

      await this.summaryTransformManager.start(summaryTransformId);
      rollbackOperations.push(() => this.summaryTransformManager.stop(summaryTransformId));

      await retryTransientEsErrors(
        () =>
          this.esClient.index({
            index: SLO_SUMMARY_TEMP_INDEX_NAME,
            id: `slo-${slo.id}`,
            document: createTempSummaryDocument(slo, this.spaceId, this.basePath),
            refresh: true,
          }),
        { logger: this.logger }
      );
    } catch (err) {
      this.logger.error(
        `Cannot install the SLO [id: ${slo.id}, revision: ${slo.revision}]. Rolling back.`
      );

      await asyncForEach(rollbackOperations.reverse(), async (operation) => {
        try {
          await operation();
        } catch (rollbackErr) {
          this.logger.error('Rollback operation failed', rollbackErr);
        }
      });

      if (err.meta?.body?.error?.type === 'security_exception') {
        throw new SecurityException(err.meta.body.error.reason);
      }

      throw err;
    }

    return this.toResponse(slo);
  }

  public async inspect(params: CreateSLOParams): Promise<{
    slo: CreateSLOParams;
    pipeline: Record<string, any>;
    rollUpTransform: TransformPutTransformRequest;
    summaryTransform: TransformPutTransformRequest;
    temporaryDoc: Record<string, any>;
    rollUpTransformCompositeQuery: string;
    summaryTransformCompositeQuery: string;
  }> {
    const slo = this.toSLO(params);
    validateSLO(slo);

    const rollUpTransform = await this.transformManager.inspect(slo);
    const pipeline = getSLOSummaryPipelineTemplate(slo, this.spaceId, this.basePath);
    const summaryTransform = await this.summaryTransformManager.inspect(slo);
    const temporaryDoc = createTempSummaryDocument(slo, this.spaceId, this.basePath);

    return {
      slo,
      pipeline,
      temporaryDoc,
      summaryTransform,
      rollUpTransform,
      // @ts-expect-error there is some issue with deprecated types being used in es types
      rollUpTransformCompositeQuery: getTransformQueryComposite(rollUpTransform),
      // @ts-expect-error there is some issue with deprecated types being used in es types
      summaryTransformCompositeQuery: getTransformQueryComposite(summaryTransform),
    };
  }

  private toSLO(params: CreateSLOParams): SLODefinition {
    const now = new Date();
    return {
      ...params,
      id: params.id ?? uuidv4(),
      settings: {
        syncDelay: params.settings?.syncDelay ?? new Duration(1, DurationUnit.Minute),
        frequency: params.settings?.frequency ?? new Duration(1, DurationUnit.Minute),
        preventInitialBackfill: params.settings?.preventInitialBackfill ?? false,
      },
      revision: params.revision ?? 1,
      enabled: true,
      tags: params.tags ?? [],
      createdAt: now,
      updatedAt: now,
      groupBy: !!params.groupBy ? params.groupBy : ALL_VALUE,
      version: SLO_MODEL_VERSION,
    };
  }

  private toResponse(slo: SLODefinition): CreateSLOResponse {
    return {
      id: slo.id,
    };
  }
}
