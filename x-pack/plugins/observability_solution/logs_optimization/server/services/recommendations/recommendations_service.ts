/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { IndexManager } from '../../lib/index_manager';
import { RecommendationsClient } from './recommendations_client';
import {
  RecommendationsServiceSetup,
  RecommendationsServiceSetupDeps,
  RecommendationsServiceStart,
  RecommendationsServiceStartDeps,
} from './types';

export class RecommendationsService {
  private getStartServices!: RecommendationsServiceSetupDeps['getStartServices'];

  constructor(private readonly logger: Logger) {}

  public setup({ getStartServices }: RecommendationsServiceSetupDeps): RecommendationsServiceSetup {
    this.getStartServices = getStartServices;

    return {};
  }

  public start({
    detectionsService,
  }: RecommendationsServiceStartDeps): RecommendationsServiceStart {
    const { getStartServices, logger } = this;

    return {
      getClient(esClient, detectionsClient, indexManagerCreator) {
        return RecommendationsClient.create({
          detectionsClient,
          esClient,
          indexManagerCreator,
          logger,
        });
      },

      async getScopedClient(request) {
        const [core] = await getStartServices();

        const esClient = core.elasticsearch.client.asScoped(request).asCurrentUser;
        const detectionsClient = await detectionsService.getClient(esClient);
        const indexManagerCreator = IndexManager.create(esClient);

        return this.getClient(esClient, detectionsClient, indexManagerCreator);
      },
    };
  }
}
