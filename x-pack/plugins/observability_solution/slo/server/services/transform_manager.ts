/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';

import { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { SLODefinition, IndicatorTypes } from '../domain/models';
import { SecurityException } from '../errors';
import { retryTransientEsErrors } from '../utils/retry';
import { TransformGenerator } from './transform_generators';

type TransformId = string;

export interface TransformManager {
  install(slo: SLODefinition): Promise<TransformId>;
  inspect(slo: SLODefinition): TransformPutTransformRequest;
  preview(transformId: TransformId): Promise<void>;
  start(transformId: TransformId): Promise<void>;
  stop(transformId: TransformId): Promise<void>;
  uninstall(transformId: TransformId): Promise<void>;
}

export class DefaultTransformManager implements TransformManager {
  constructor(
    private generators: Record<IndicatorTypes, TransformGenerator>,
    private esClient: ElasticsearchClient,
    private logger: Logger,
    private spaceId: string
  ) {}

  async install(slo: SLODefinition): Promise<TransformId> {
    const generator = this.generators[slo.indicator.type];
    if (!generator) {
      this.logger.error(`No transform generator found for indicator type [${slo.indicator.type}]`);
      throw new Error(`Unsupported indicator type [${slo.indicator.type}]`);
    }

    const transformParams = generator.getTransformParams(slo, this.spaceId);
    try {
      await retryTransientEsErrors(() => this.esClient.transform.putTransform(transformParams), {
        logger: this.logger,
      });
    } catch (err) {
      this.logger.error(`Cannot create SLO transform for indicator type [${slo.indicator.type}]`);
      if (err.meta?.body?.error?.type === 'security_exception') {
        throw new SecurityException(err.meta.body.error.reason);
      }

      throw err;
    }

    return transformParams.transform_id;
  }

  inspect(slo: SLODefinition): TransformPutTransformRequest {
    const generator = this.generators[slo.indicator.type];
    if (!generator) {
      this.logger.error(`No transform generator found for indicator type [${slo.indicator.type}]`);
      throw new Error(`Unsupported indicator type [${slo.indicator.type}]`);
    }

    return generator.getTransformParams(slo, this.spaceId);
  }

  async preview(transformId: string): Promise<void> {
    try {
      await retryTransientEsErrors(
        () => this.esClient.transform.previewTransform({ transform_id: transformId }),
        { logger: this.logger }
      );
    } catch (err) {
      this.logger.error(`Cannot preview SLO transform [${transformId}]`);
      throw err;
    }
  }

  async start(transformId: TransformId): Promise<void> {
    try {
      await retryTransientEsErrors(
        () =>
          this.esClient.transform.startTransform({ transform_id: transformId }, { ignore: [409] }),
        { logger: this.logger }
      );
    } catch (err) {
      this.logger.error(`Cannot start SLO transform [${transformId}]`);
      throw err;
    }
  }

  async stop(transformId: TransformId): Promise<void> {
    try {
      await retryTransientEsErrors(
        () =>
          this.esClient.transform.stopTransform(
            { transform_id: transformId, wait_for_completion: true, force: true },
            { ignore: [404] }
          ),
        { logger: this.logger }
      );
    } catch (err) {
      this.logger.error(`Cannot stop SLO transform [${transformId}]`);
      throw err;
    }
  }

  async uninstall(transformId: TransformId): Promise<void> {
    try {
      await retryTransientEsErrors(
        () =>
          this.esClient.transform.deleteTransform(
            { transform_id: transformId, force: true },
            { ignore: [404] }
          ),
        { logger: this.logger }
      );
    } catch (err) {
      this.logger.error(`Cannot delete SLO transform [${transformId}]`);
      throw err;
    }
  }
}
