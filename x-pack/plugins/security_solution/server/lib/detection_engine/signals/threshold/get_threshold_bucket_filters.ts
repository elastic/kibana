/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import { ESFilter } from '../../../../../../../../src/core/types/elasticsearch';
import { ThresholdSignalHistory, ThresholdSignalHistoryRecord } from '../types';

/*
 * Returns a filter to exclude events that have already been included in a
 * previous threshold signal. Uses the threshold signal history to achieve this.
 */
export const getThresholdBucketFilters = async ({
  signalHistory,
  timestampOverride,
}: {
  signalHistory: ThresholdSignalHistory;
  timestampOverride: string | undefined;
}): Promise<Filter[]> => {
  const filters = Object.values(signalHistory).reduce(
    (acc: ESFilter[], bucket: ThresholdSignalHistoryRecord): ESFilter[] => {
      const filter = {
        bool: {
          filter: [
            {
              range: {
                [timestampOverride ?? '@timestamp']: {
                  // Timestamp of last event signaled on for this set of terms.
                  lte: new Date(bucket.lastSignalTimestamp).toISOString(),
                },
              },
            },
          ],
        },
      } as ESFilter;

      // Terms to filter events older than `lastSignalTimestamp`.
      bucket.terms.forEach((term) => {
        if (term.field != null) {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          (filter.bool!.filter as ESFilter[]).push({
            term: {
              [term.field]: `${term.value}`,
            },
          });
        }
      });

      return [...acc, filter];
    },
    [] as ESFilter[]
  );

  return [
    {
      bool: {
        must_not: filters,
      },
    } as unknown as Filter,
  ];
};
