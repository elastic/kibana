/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import { IScopedClusterClient, Logger } from '@kbn/core/server';
import { SLODefinition } from '../domain/models';
import { SecurityException } from '../errors';
import { retryTransientEsErrors } from '../utils/retry';
import { SummaryTransformGenerator } from './summary_transform_generator/summary_transform_generator';
import { TransformManager } from './transform_manager';

type TransformId = string;

export class DefaultSummaryTransformManager implements TransformManager {
  constructor(
    private generator: SummaryTransformGenerator,
    private scopedClusterClient: IScopedClusterClient,
    private logger: Logger
  ) {}

  async install(slo: SLODefinition, startTransform?: boolean): Promise<TransformId> {
    const transformParams = await this.generator.generate(slo);
    try {
      await retryTransientEsErrors(
        () => this.scopedClusterClient.asSecondaryAuthUser.transform.putTransform(transformParams),
        {
          logger: this.logger,
        }
      );
      if (startTransform) {
        await this.start(transformParams.transform_id);
      }
    } catch (err) {
      this.logger.error(`Cannot create summary transform for SLO [${slo.id}]`);
      if (err.meta?.body?.error?.type === 'security_exception') {
        throw new SecurityException(err.meta.body.error.reason);
      }

      throw err;
    }

    return transformParams.transform_id;
  }

  async inspect(slo: SLODefinition): Promise<TransformPutTransformRequest> {
    return this.generator.generate(slo);
  }

  async preview(transformId: string): Promise<void> {
    try {
      await retryTransientEsErrors(
        () =>
          this.scopedClusterClient.asSecondaryAuthUser.transform.previewTransform({
            transform_id: transformId,
          }),
        { logger: this.logger }
      );
    } catch (err) {
      this.logger.error(`Cannot preview SLO summary transform [${transformId}]`);
      throw err;
    }
  }

  async start(transformId: TransformId): Promise<void> {
    try {
      await retryTransientEsErrors(
        () =>
          this.scopedClusterClient.asSecondaryAuthUser.transform.startTransform(
            { transform_id: transformId },
            { ignore: [409] }
          ),
        {
          logger: this.logger,
        }
      );
    } catch (err) {
      this.logger.error(`Cannot start SLO summary transform [${transformId}]`);
      throw err;
    }
  }

  async stop(transformId: TransformId): Promise<void> {
    try {
      await retryTransientEsErrors(
        () =>
          this.scopedClusterClient.asSecondaryAuthUser.transform.stopTransform(
            { transform_id: transformId, wait_for_completion: true, force: true },
            { ignore: [404] }
          ),
        { logger: this.logger }
      );
    } catch (err) {
      this.logger.error(`Cannot stop SLO summary transform [${transformId}]`);
      throw err;
    }
  }

  async uninstall(transformId: TransformId): Promise<void> {
    try {
      await retryTransientEsErrors(
        () =>
          this.scopedClusterClient.asSecondaryAuthUser.transform.deleteTransform(
            { transform_id: transformId, force: true },
            { ignore: [404] }
          ),
        { logger: this.logger }
      );
    } catch (err) {
      this.logger.error(`Cannot delete SLO summary transform [${transformId}]`);
      throw err;
    }
  }
}
