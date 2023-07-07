/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { SLO_RESOURCES_VERSION } from '../../../assets/constants';
import { retryTransientEsErrors } from '../../../utils/retry';
import { ALL_TRANSFORM_TEMPLATES } from './templates';

export interface SummaryTransformInstaller {
  installAndStart(): Promise<void>;
}

export class DefaultSummaryTransformInstaller implements SummaryTransformInstaller {
  constructor(private esClient: ElasticsearchClient, private logger: Logger) {}

  public async installAndStart(): Promise<void> {
    const allTransformIds = ALL_TRANSFORM_TEMPLATES.map((t) => t.transform_id);
    const response = await retryTransientEsErrors(
      () =>
        this.esClient.transform.getTransform(
          { transform_id: allTransformIds, allow_no_match: true },
          { ignore: [404] }
        ),
      { logger: this.logger }
    );

    // @ts-ignore Incorrectly typed
    const existingTransforms = response.existingTransforms || response.transforms;

    for (const transformTemplate of ALL_TRANSFORM_TEMPLATES) {
      const transformId = transformTemplate.transform_id;
      const transform = existingTransforms.find((t) => t.id === transformId);

      const transformAlreadyInstalled =
        !!transform && transform._meta?.version === SLO_RESOURCES_VERSION;
      const previousTransformAlreadyInstalled =
        !!transform && transform._meta?.version !== SLO_RESOURCES_VERSION;

      if (transformAlreadyInstalled) {
        this.logger.info(`Skipping install SLO summary transform: ${transformId}`);
        await this.startTransform(transformId);
        continue;
      }

      if (previousTransformAlreadyInstalled) {
        await this.deletePreviousTransformVersion(transformId);
      }

      await this.installTransform(transformId, transformTemplate);
      await this.startTransform(transformId);
    }

    this.logger.info(`All SLO summary transforms installed and started`);
  }

  private async installTransform(
    transformId: string,
    transformTemplate: TransformPutTransformRequest
  ) {
    this.logger.info(`Installing SLO summary transform: ${transformId}`);
    await retryTransientEsErrors(
      () => this.esClient.transform.putTransform(transformTemplate, { ignore: [409] }),
      { logger: this.logger }
    );
  }

  private async deletePreviousTransformVersion(transformId: string) {
    this.logger.info(`Deleting previous SLO summary transform: ${transformId}`);
    await retryTransientEsErrors(
      () =>
        this.esClient.transform.stopTransform(
          { transform_id: transformId, allow_no_match: true, force: true },
          { ignore: [409, 404] }
        ),
      { logger: this.logger }
    );
    await retryTransientEsErrors(
      () =>
        this.esClient.transform.deleteTransform(
          { transform_id: transformId, force: true },
          { ignore: [409, 404] }
        ),
      { logger: this.logger }
    );
  }

  private async startTransform(transformId: string) {
    this.logger.info(`Starting SLO summary transform: ${transformId}`);
    await retryTransientEsErrors(
      () =>
        this.esClient.transform.startTransform({ transform_id: transformId }, { ignore: [409] }),
      { logger: this.logger }
    );
  }
}
