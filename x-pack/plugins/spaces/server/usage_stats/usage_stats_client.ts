/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { deepFreeze } from '@kbn/std';
import { ISavedObjectsRepository, Headers } from 'src/core/server';
import { SPACES_USAGE_STATS_TYPE, SPACES_USAGE_STATS_ID } from './constants';
import { CopyOptions, ResolveConflictsOptions } from '../lib/copy_to_spaces/types';
import { UsageStats } from './types';

interface BaseIncrementOptions {
  headers?: Headers;
}
export type IncrementCopySavedObjectsOptions = BaseIncrementOptions &
  Pick<CopyOptions, 'createNewCopies' | 'overwrite'>;
export type IncrementResolveCopySavedObjectsErrorsOptions = BaseIncrementOptions &
  Pick<ResolveConflictsOptions, 'createNewCopies'>;

const COPY_DEFAULT = deepFreeze({
  total: 0,
  kibanaRequest: { yes: 0, no: 0 },
  createNewCopiesEnabled: { yes: 0, no: 0 },
  overwriteEnabled: { yes: 0, no: 0 },
});
const RESOLVE_COPY_ERRORS_DEFAULT = deepFreeze({
  total: 0,
  kibanaRequest: { yes: 0, no: 0 },
  createNewCopiesEnabled: { yes: 0, no: 0 },
});

export class UsageStatsClient {
  constructor(
    private readonly debugLogger: (message: string) => void,
    private readonly repositoryPromise: Promise<ISavedObjectsRepository>
  ) {}

  public async getUsageStats() {
    this.debugLogger('getUsageStats() called');
    let usageStats: UsageStats = {};
    try {
      const repository = await this.repositoryPromise;
      const result = await repository.get<UsageStats>(
        SPACES_USAGE_STATS_TYPE,
        SPACES_USAGE_STATS_ID
      );
      usageStats = result.attributes;
    } catch (err) {
      // do nothing
    }
    return usageStats;
  }

  public async incrementCopySavedObjects({
    headers,
    createNewCopies,
    overwrite,
  }: IncrementCopySavedObjectsOptions) {
    const usageStats = await this.getUsageStats();
    const { apiCalls = {} } = usageStats;
    const { copySavedObjects: current = COPY_DEFAULT } = apiCalls;

    const attributes = {
      ...usageStats,
      apiCalls: {
        ...apiCalls,
        copySavedObjects: {
          total: current.total + 1,
          kibanaRequest: incrementKibanaRequestCounter(current.kibanaRequest, headers),
          createNewCopiesEnabled: incrementBooleanCounter(
            current.createNewCopiesEnabled,
            createNewCopies
          ),
          overwriteEnabled: incrementBooleanCounter(current.overwriteEnabled, overwrite),
        },
      },
    };
    await this.updateUsageStats(attributes);
  }

  public async incrementResolveCopySavedObjectsErrors({
    headers,
    createNewCopies,
  }: IncrementResolveCopySavedObjectsErrorsOptions) {
    const usageStats = await this.getUsageStats();
    const { apiCalls = {} } = usageStats;
    const { resolveCopySavedObjectsErrors: current = RESOLVE_COPY_ERRORS_DEFAULT } = apiCalls;

    const attributes = {
      ...usageStats,
      apiCalls: {
        ...apiCalls,
        resolveCopySavedObjectsErrors: {
          total: current.total + 1,
          kibanaRequest: incrementKibanaRequestCounter(current.kibanaRequest, headers),
          createNewCopiesEnabled: incrementBooleanCounter(
            current.createNewCopiesEnabled,
            createNewCopies
          ),
        },
      },
    };
    await this.updateUsageStats(attributes);
  }

  private async updateUsageStats(attributes: UsageStats) {
    const options = { id: SPACES_USAGE_STATS_ID, overwrite: true, refresh: false };
    try {
      const repository = await this.repositoryPromise;
      await repository.create(SPACES_USAGE_STATS_TYPE, attributes, options);
    } catch (err) {
      // do nothing
    }
  }
}

function incrementKibanaRequestCounter(current: { yes: number; no: number }, headers?: Headers) {
  // The presence of these three request headers gives us a good indication that this is a first-party request from the Kibana client.
  // We can't be 100% certain, but this is a reasonable attempt.
  const isKibanaRequest = headers && headers['kbn-version'] && headers.origin && headers.referer;
  return {
    yes: current.yes + (isKibanaRequest ? 1 : 0),
    no: current.no + (isKibanaRequest ? 0 : 1),
  };
}

function incrementBooleanCounter(current: { yes: number; no: number }, value: boolean) {
  return {
    yes: current.yes + (value ? 1 : 0),
    no: current.no + (value ? 0 : 1),
  };
}
