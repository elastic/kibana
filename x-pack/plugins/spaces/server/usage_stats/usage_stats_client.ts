/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ISavedObjectsRepository, Headers } from 'src/core/server';
import { SPACES_USAGE_STATS_TYPE } from './constants';
import { CopyOptions, ResolveConflictsOptions } from '../lib/copy_to_spaces/types';
import { UsageStats } from './types';

interface BaseIncrementOptions {
  headers?: Headers;
}
export type IncrementCopySavedObjectsOptions = BaseIncrementOptions &
  Pick<CopyOptions, 'createNewCopies' | 'overwrite'>;
export type IncrementResolveCopySavedObjectsErrorsOptions = BaseIncrementOptions &
  Pick<ResolveConflictsOptions, 'createNewCopies'>;

const COPY_DEFAULT = Object.freeze({
  total: 0,
  kibanaRequest: Object.freeze({ yes: 0, no: 0 }),
  createNewCopiesEnabled: Object.freeze({ yes: 0, no: 0 }),
  overwriteEnabled: Object.freeze({ yes: 0, no: 0 }),
});
const RESOLVE_COPY_ERRORS_DEFAULT = Object.freeze({
  total: 0,
  kibanaRequest: Object.freeze({ yes: 0, no: 0 }),
  createNewCopiesEnabled: Object.freeze({ yes: 0, no: 0 }),
});

export class UsageStatsClient {
  constructor(
    private readonly debugLogger: (message: string) => void,
    private readonly repository: ISavedObjectsRepository
  ) {}

  public async getUsageStats() {
    this.debugLogger('getUsageStats() called');
    let usageStats: UsageStats = {};
    try {
      const result = await this.repository.get<UsageStats>(
        SPACES_USAGE_STATS_TYPE,
        SPACES_USAGE_STATS_TYPE
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
    const options = { id: SPACES_USAGE_STATS_TYPE, overwrite: true };
    try {
      await this.repository.create(SPACES_USAGE_STATS_TYPE, attributes, options);
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
