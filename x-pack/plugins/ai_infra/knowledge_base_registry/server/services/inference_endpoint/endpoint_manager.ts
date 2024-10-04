/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { internalElserInferenceId } from '../../../common/consts';
import { installElser, getModelInstallStatus, waitUntilModelDeployed } from './utils';

export class InferenceEndpointManager {
  private readonly log: Logger;
  private readonly esClient: ElasticsearchClient;

  constructor({ logger, esClient }: { logger: Logger; esClient: ElasticsearchClient }) {
    this.log = logger;
    this.esClient = esClient;
  }

  async ensureInternalElserInstalled() {
    const { installed } = await getModelInstallStatus({
      inferenceId: internalElserInferenceId,
      client: this.esClient,
      log: this.log,
    });
    if (!installed) {
      await installElser({
        inferenceId: internalElserInferenceId,
        client: this.esClient,
        log: this.log,
      });
    }

    await waitUntilModelDeployed({
      modelId: internalElserInferenceId,
      client: this.esClient,
      log: this.log,
    });
  }
}
