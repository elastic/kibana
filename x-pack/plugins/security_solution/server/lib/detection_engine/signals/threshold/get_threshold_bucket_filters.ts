/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Filter } from 'src/plugins/data/common';
import { ESFilter } from '../../../../../../../../src/core/types/elasticsearch';
import { ThresholdSignalHistory, ThresholdSignalHistoryRecord } from '../types';

export const getThresholdBucketFilters = async ({
  thresholdSignalHistory,
  timestampOverride,
}: {
  thresholdSignalHistory: ThresholdSignalHistory;
  timestampOverride: string | undefined;
}): Promise<Filter[]> => {
  const filters = Object.values(thresholdSignalHistory).reduce(
    (acc: ESFilter[], bucket: ThresholdSignalHistoryRecord): ESFilter[] => {
      const filter = {
        bool: {
          filter: [
            {
              range: {
                [timestampOverride ?? '@timestamp']: {
                  lte: new Date(bucket.lastSignalTimestamp).toISOString(),
                },
              },
            },
          ],
        },
      } as ESFilter;

      bucket.terms.forEach((term) => {
        if (term.field != null) {
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
    ({
      bool: {
        must_not: filters,
      },
    } as unknown) as Filter,
  ];
};
