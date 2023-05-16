/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { getSLOSummaryTransformId, getSLOTransformId } from '../../assets/constants';

import { SLO } from '../../domain/models';
import { retryTransientEsErrors } from '../../utils/retry';
import { RollupTransformGenerator } from './rollup_transform_generators';
import { SummaryTransformGenerator } from './summary_transform_generator';

export interface TransformManager {
  install(slo: SLO): Promise<void>;
  start(slo: SLO): Promise<void>;
  stop(slo: SLO): Promise<void>;
  uninstall(slo: SLO): Promise<void>;
}

export class DefaultTransformManager implements TransformManager {
  constructor(
    private getRollupTransformGenerator: (slo: SLO) => RollupTransformGenerator,
    private summaryTransformGenerator: SummaryTransformGenerator,
    private esClient: ElasticsearchClient,
    private logger: Logger
  ) {}

  async install(slo: SLO): Promise<void> {
    const rollupTransformGenerator = this.getRollupTransformGenerator(slo);
    if (!rollupTransformGenerator) {
      this.logger.error(`No rollup transform generator found for SLI type: ${slo.indicator.type}`);
      throw new Error(`Unsupported SLI type: ${slo.indicator.type}`);
    }

    const transformParams = rollupTransformGenerator.generate(slo);
    try {
      await retryTransientEsErrors(() => this.esClient.transform.putTransform(transformParams), {
        logger: this.logger,
      });
    } catch (err) {
      this.logger.error(`Cannot create rollup transform: ${err}`);
      throw err;
    }

    const summaryTransformParams = this.summaryTransformGenerator.generate(slo);
    try {
      await retryTransientEsErrors(
        () => this.esClient.transform.putTransform(summaryTransformParams),
        {
          logger: this.logger,
        }
      );
    } catch (err) {
      this.logger.error(`Cannot create summary transform: ${err}`);
      throw err;
    }
  }

  async start(slo: SLO): Promise<void> {
    const transformId = getSLOTransformId(slo.id, slo.revision);
    try {
      await retryTransientEsErrors(
        () =>
          this.esClient.transform.startTransform({ transform_id: transformId }, { ignore: [409] }),
        { logger: this.logger }
      );
    } catch (err) {
      this.logger.error(`Cannot start transform id ${transformId}: ${err}`);
      throw err;
    }

    const summaryTransformId = getSLOSummaryTransformId(slo.id, slo.revision);
    try {
      await retryTransientEsErrors(
        () =>
          this.esClient.transform.startTransform(
            { transform_id: summaryTransformId },
            { ignore: [409] }
          ),
        { logger: this.logger }
      );
    } catch (err) {
      this.logger.error(`Cannot start summary transform id ${summaryTransformId}: ${err}`);
      throw err;
    }
  }

  async stop(slo: SLO): Promise<void> {
    const summaryTransformId = getSLOSummaryTransformId(slo.id, slo.revision);
    try {
      await retryTransientEsErrors(
        () =>
          this.esClient.transform.stopTransform(
            { transform_id: summaryTransformId, wait_for_completion: true },
            { ignore: [404] }
          ),
        { logger: this.logger }
      );
    } catch (err) {
      this.logger.error(`Cannot stop summary transform id ${summaryTransformId}: ${err}`);
      throw err;
    }

    const transformId = getSLOTransformId(slo.id, slo.revision);
    try {
      await retryTransientEsErrors(
        () =>
          this.esClient.transform.stopTransform(
            { transform_id: transformId, wait_for_completion: true },
            { ignore: [404] }
          ),
        { logger: this.logger }
      );
    } catch (err) {
      this.logger.error(`Cannot stop transform id ${transformId}: ${err}`);
      throw err;
    }
  }

  async uninstall(slo: SLO): Promise<void> {
    const summaryTransformId = getSLOSummaryTransformId(slo.id, slo.revision);
    try {
      await retryTransientEsErrors(
        () =>
          this.esClient.transform.deleteTransform(
            { transform_id: summaryTransformId, force: true },
            { ignore: [404] }
          ),
        { logger: this.logger }
      );
    } catch (err) {
      this.logger.error(`Cannot delete summary transform id ${summaryTransformId}: ${err}`);
      throw err;
    }

    const transformId = getSLOTransformId(slo.id, slo.revision);
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
      this.logger.error(`Cannot delete transform id ${transformId}: ${err}`);
      throw err;
    }
  }
}
