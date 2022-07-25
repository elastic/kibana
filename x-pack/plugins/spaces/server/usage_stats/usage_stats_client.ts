/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Headers, ISavedObjectsRepository } from '@kbn/core/server';

import type { CopyOptions, ResolveConflictsOptions } from '../lib/copy_to_spaces/types';
import { SPACES_USAGE_STATS_ID, SPACES_USAGE_STATS_TYPE } from './constants';
import type { UsageStats } from './types';

interface BaseIncrementOptions {
  headers?: Headers;
}
export type IncrementCopySavedObjectsOptions = BaseIncrementOptions &
  Pick<CopyOptions, 'createNewCopies' | 'overwrite'>;
export type IncrementResolveCopySavedObjectsErrorsOptions = BaseIncrementOptions &
  Pick<ResolveConflictsOptions, 'createNewCopies'>;

export const COPY_STATS_PREFIX = 'apiCalls.copySavedObjects';
export const RESOLVE_COPY_STATS_PREFIX = 'apiCalls.resolveCopySavedObjectsErrors';
export const DISABLE_LEGACY_URL_ALIASES_STATS_PREFIX = 'apiCalls.disableLegacyUrlAliases';
const ALL_COUNTER_FIELDS = [
  `${COPY_STATS_PREFIX}.total`,
  `${COPY_STATS_PREFIX}.kibanaRequest.yes`,
  `${COPY_STATS_PREFIX}.kibanaRequest.no`,
  `${COPY_STATS_PREFIX}.createNewCopiesEnabled.yes`,
  `${COPY_STATS_PREFIX}.createNewCopiesEnabled.no`,
  `${COPY_STATS_PREFIX}.overwriteEnabled.yes`,
  `${COPY_STATS_PREFIX}.overwriteEnabled.no`,
  `${RESOLVE_COPY_STATS_PREFIX}.total`,
  `${RESOLVE_COPY_STATS_PREFIX}.kibanaRequest.yes`,
  `${RESOLVE_COPY_STATS_PREFIX}.kibanaRequest.no`,
  `${RESOLVE_COPY_STATS_PREFIX}.createNewCopiesEnabled.yes`,
  `${RESOLVE_COPY_STATS_PREFIX}.createNewCopiesEnabled.no`,
  `${DISABLE_LEGACY_URL_ALIASES_STATS_PREFIX}.total`,
];
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
      const result = await repository.incrementCounter<UsageStats>(
        SPACES_USAGE_STATS_TYPE,
        SPACES_USAGE_STATS_ID,
        ALL_COUNTER_FIELDS,
        { initialize: true }
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
    const isKibanaRequest = getIsKibanaRequest(headers);
    const counterFieldNames = [
      'total',
      `kibanaRequest.${isKibanaRequest ? 'yes' : 'no'}`,
      `createNewCopiesEnabled.${createNewCopies ? 'yes' : 'no'}`,
      ...(!createNewCopies ? [`overwriteEnabled.${overwrite ? 'yes' : 'no'}`] : []), // the overwrite option is ignored when createNewCopies is true
    ];
    await this.updateUsageStats(counterFieldNames, COPY_STATS_PREFIX);
  }

  public async incrementResolveCopySavedObjectsErrors({
    headers,
    createNewCopies,
  }: IncrementResolveCopySavedObjectsErrorsOptions) {
    const isKibanaRequest = getIsKibanaRequest(headers);
    const counterFieldNames = [
      'total',
      `kibanaRequest.${isKibanaRequest ? 'yes' : 'no'}`,
      `createNewCopiesEnabled.${createNewCopies ? 'yes' : 'no'}`,
    ];
    await this.updateUsageStats(counterFieldNames, RESOLVE_COPY_STATS_PREFIX);
  }

  public async incrementDisableLegacyUrlAliases() {
    const counterFieldNames = ['total'];
    await this.updateUsageStats(counterFieldNames, DISABLE_LEGACY_URL_ALIASES_STATS_PREFIX);
  }

  private async updateUsageStats(counterFieldNames: string[], prefix: string) {
    const options = { refresh: false };
    try {
      const repository = await this.repositoryPromise;
      await repository.incrementCounter(
        SPACES_USAGE_STATS_TYPE,
        SPACES_USAGE_STATS_ID,
        counterFieldNames.map((x) => `${prefix}.${x}`),
        options
      );
    } catch (err) {
      // do nothing
    }
  }
}

function getIsKibanaRequest(headers?: Headers) {
  // The presence of these two request headers gives us a good indication that this is a first-party request from the Kibana client.
  // We can't be 100% certain, but this is a reasonable attempt.
  return headers && headers['kbn-version'] && headers.referer;
}
