/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { ISearchSource } from '@kbn/data-plugin/common';
import { RuleExecutionMetrics } from '../types';
import { LogSearchMetricsOpts, RuleInfo } from './types';

export function wrapSearchSourceFetch({
  logger,
  rule,
  abortController,
}: {
  logger: Logger;
  rule: RuleInfo;
  abortController: AbortController;
}) {
  let numSearches: number = 0;
  let esSearchDurationMs: number = 0;
  let totalSearchDurationMs: number = 0;

  function logMetrics(metrics: LogSearchMetricsOpts) {
    numSearches++;
    esSearchDurationMs += metrics.esSearchDuration;
    totalSearchDurationMs += metrics.totalSearchDuration;
  }

  return {
    fetch: async (searchSource: ISearchSource) => {
      try {
        const start = Date.now();
        logger.debug(
          `executing query for rule ${rule.alertTypeId}:${rule.id} in space ${rule.spaceId}`
        );
        const result = await searchSource.fetch({ abortSignal: abortController.signal });

        const durationMs = Date.now() - start;
        logMetrics({ esSearchDuration: result.took ?? 0, totalSearchDuration: durationMs });
        return result;
      } catch (e) {
        if (abortController.signal.aborted) {
          throw new Error('Search has been aborted due to cancelled execution');
        }
        throw e;
      }
    },
    getMetrics: (): RuleExecutionMetrics => {
      return {
        esSearchDurationMs,
        totalSearchDurationMs,
        numSearches,
      };
    },
  };
}
