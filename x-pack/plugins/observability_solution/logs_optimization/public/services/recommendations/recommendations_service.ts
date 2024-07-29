/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RecommendationsClient } from './recommendations_client';
import type {
  RecommendationsServiceStartDeps,
  RecommendationsServiceSetup,
  RecommendationsServiceStart,
} from './types';

export class RecommendationsService {
  private client?: RecommendationsClient;

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
      const module = await import('./recommendations_client');
      const client = new module.RecommendationsClient(http);
      this.client = client;
    }

    return this.client;
  }
}
