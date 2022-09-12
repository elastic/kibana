/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { SLO, SLITypes } from '../../types/models';
import { TransformGenerator } from './transform_generators';

export class TransformInstaller {
  constructor(
    private generators: Record<SLITypes, TransformGenerator>,
    private esClient: ElasticsearchClient,
    private logger: Logger
  ) {}

  async installAndStartTransform(slo: SLO, spaceId: string = 'default'): Promise<void> {
    const generator = this.generators[slo.indicator.type];
    if (!generator) {
      this.logger.error(`No transform generator found for ${slo.indicator.type} SLO type`);
      throw new Error(`Unsupported SLO type: ${slo.indicator.type}`);
    }

    const transformParams = generator.getTransformParams(slo, spaceId);
    try {
      await this.esClient.transform.putTransform(transformParams);
    } catch (err) {
      // swallow the error if the transform already exists.
      const isAlreadyExistError =
        err instanceof errors.ResponseError &&
        err?.body?.error?.type === 'resource_already_exists_exception';
      if (!isAlreadyExistError) {
        this.logger.error(`Cannot create transform for ${slo.indicator.type} SLO type: ${err}`);
        throw err;
      }
    }

    try {
      await this.esClient.transform.startTransform(
        { transform_id: transformParams.transform_id },
        { ignore: [409] }
      );
    } catch (err) {
      this.logger.error(`Cannot start transform id ${transformParams.transform_id}: ${err}`);
      throw err;
    }
  }
}
