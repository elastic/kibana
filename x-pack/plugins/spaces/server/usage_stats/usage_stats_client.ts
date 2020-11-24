/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ISavedObjectsRepository } from 'src/core/server';
import { SPACES_USAGE_STATS_TYPE } from './constants';
import { CopyOptions, ResolveConflictsOptions } from '../lib/copy_to_spaces/types';
import { UsageStats } from './types';

type IncrementCopySavedObjectsOptions = Pick<CopyOptions, 'createNewCopies' | 'overwrite'>;
type IncrementResolveCopySavedObjectsErrorsOptions = Pick<
  ResolveConflictsOptions,
  'createNewCopies'
>;

const COPY_DEFAULT = Object.freeze({
  total: 0,
  createNewCopiesEnabled: Object.freeze({ yes: 0, no: 0 }),
  overwriteEnabled: Object.freeze({ yes: 0, no: 0 }),
});
const RESOLVE_COPY_ERRORS_DEFAULT = Object.freeze({
  total: 0,
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
    return this.repository.create(SPACES_USAGE_STATS_TYPE, attributes, options);
  }
}

function incrementBooleanCounter(current: { yes: number; no: number }, value: boolean) {
  return {
    yes: current.yes + (value ? 1 : 0),
    no: current.no + (value ? 0 : 1),
  };
}
