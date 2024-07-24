/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RecommendationsServiceStartDeps,
  RecommendationsServiceSetup,
  RecommendationsServiceStart,
  IRecommendationsClient,
} from './types';

export class RecommendationsService {
  private client?: IRecommendationsClient;

  public setup(): RecommendationsServiceSetup {
    return {};
  }

  public start({ http }: RecommendationsServiceStartDeps): RecommendationsServiceStart {
    return {
      getClient: () => this.getClient({ http }),
    };
  }

  private async getClient({ http }: RecommendationsServiceStartDeps) {
    if (!this.client) {
      const { RecommendationsClient } = await import('./recommendations_client');
      const client = new RecommendationsClient(http);
      this.client = client;
    }

    return this.client;
  }
}
