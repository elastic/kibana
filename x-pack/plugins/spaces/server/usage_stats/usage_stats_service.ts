/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger, CoreSetup } from '../../../../../src/core/server';
import { UsageStatsClient } from './usage_stats_client';
import { SPACES_USAGE_STATS_TYPE } from './constants';

export interface UsageStatsServiceSetup {
  getClient(): Promise<UsageStatsClient>;
}

interface UsageStatsServiceDeps {
  getStartServices: CoreSetup['getStartServices'];
}

export class UsageStatsService {
  constructor(private readonly log: Logger) {}

  public async setup({ getStartServices }: UsageStatsServiceDeps): Promise<UsageStatsServiceSetup> {
    const internalRepositoryPromise = getStartServices().then(([coreStart]) =>
      coreStart.savedObjects.createInternalRepository([SPACES_USAGE_STATS_TYPE])
    );

    const getClient = async () => {
      const internalRepository = await internalRepositoryPromise;

      return new UsageStatsClient((message: string) => {
        this.log.debug(message);
      }, internalRepository);
    };

    return { getClient };
  }

  public async stop() {}
}
