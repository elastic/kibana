/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IScopedClusterClient } from '@kbn/core/server';
import { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ElasticsearchClient, IBasePath, Logger } from '@kbn/core/server';
import { ALL_VALUE, CreateSLOParams, CreateSLOResponse } from '@kbn/slo-schema';
import { asyncForEach } from '@kbn/std';
import { v4 as uuidv4 } from 'uuid';
import { IngestPutPipelineRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  getSLOPipelineId,
  getSLOSummaryPipelineId,
  getSLOSummaryTransformId,
  getSLOTransformId,
  SLO_MODEL_VERSION,
  SLO_SUMMARY_TEMP_INDEX_NAME,
} from '../../common/constants';
import { getSLOPipelineTemplate } from '../assets/ingest_templates/slo_pipeline_template';
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
    private scopedClusterClient: IScopedClusterClient,
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

    // can be done async as we are not using the result
    void this.repository.save(slo, { throwOnConflict: true });
    rollbackOperations.push(() => this.repository.deleteById(slo.id, true));

    const rollupTransformId = getSLOTransformId(slo.id, slo.revision);
    const summaryTransformId = getSLOSummaryTransformId(slo.id, slo.revision);
    try {
      const sloPipelinePromise = this.createPipeline(getSLOPipelineTemplate(slo));
      rollbackOperations.push(() => this.deletePipeline(getSLOPipelineId(slo.id, slo.revision)));

      const rollupTransformPromise = this.transformManager.install(slo, true);
      rollbackOperations.push(() => this.transformManager.uninstall(rollupTransformId));
      rollbackOperations.push(() => this.transformManager.stop(rollupTransformId));

      const summaryPipelinePromise = this.createPipeline(
        getSLOSummaryPipelineTemplate(slo, this.spaceId, this.basePath)
      );

      rollbackOperations.push(() =>
        this.deletePipeline(getSLOSummaryPipelineId(slo.id, slo.revision))
      );

      const summaryTransformPromise = this.summaryTransformManager.install(slo, true);
      rollbackOperations.push(() => this.summaryTransformManager.uninstall(summaryTransformId));
      rollbackOperations.push(() => this.summaryTransformManager.stop(summaryTransformId));

      const tempDocPromise = this.createTempSummaryDocument(slo);

      await Promise.all([
        sloPipelinePromise,
        rollupTransformPromise,
        summaryPipelinePromise,
        summaryTransformPromise,
        tempDocPromise,
      ]);
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

  async createTempSummaryDocument(slo: SLODefinition) {
    return await retryTransientEsErrors(
      () =>
        this.esClient.index({
          index: SLO_SUMMARY_TEMP_INDEX_NAME,
          id: `slo-${slo.id}`,
          document: createTempSummaryDocument(slo, this.spaceId, this.basePath),
          refresh: true,
        }),
      { logger: this.logger }
    );
  }

  async createPipeline(params: IngestPutPipelineRequest) {
    return await retryTransientEsErrors(
      () => this.scopedClusterClient.asSecondaryAuthUser.ingest.putPipeline(params),
      { logger: this.logger }
    );
  }

  async deletePipeline(id: string) {
    return this.scopedClusterClient.asSecondaryAuthUser.ingest.deletePipeline(
      { id },
      { ignore: [404] }
    );
  }

  public async inspect(params: CreateSLOParams): Promise<{
    slo: CreateSLOParams;
    rollUpPipeline: Record<string, any>;
    summaryPipeline: Record<string, any>;
    rollUpTransform: TransformPutTransformRequest;
    summaryTransform: TransformPutTransformRequest;
    temporaryDoc: Record<string, any>;
    rollUpTransformCompositeQuery: string;
    summaryTransformCompositeQuery: string;
  }> {
    const slo = this.toSLO(params);
    validateSLO(slo);

    const rollUpTransform = await this.transformManager.inspect(slo);
    const rollUpPipeline = getSLOPipelineTemplate(slo);
    const summaryPipeline = getSLOSummaryPipelineTemplate(slo, this.spaceId, this.basePath);
    const summaryTransform = await this.summaryTransformManager.inspect(slo);
    const temporaryDoc = createTempSummaryDocument(slo, this.spaceId, this.basePath);

    return {
      slo,
      rollUpPipeline,
      summaryPipeline,
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
