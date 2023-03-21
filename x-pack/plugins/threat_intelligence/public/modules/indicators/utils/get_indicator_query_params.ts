/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { THREAT_QUERY_BASE } from '../../../common/constants';
import { RawIndicatorFieldId } from '../../../../common/types/indicator';

const TIMESTAMP_FIELD = RawIndicatorFieldId.TimeStamp;

/**
 * Prepare shared `query` fields used within indicator search request
 */
export const getIndicatorQueryParams = ({
  filters,
  filterQuery,
  timeRange,
}: {
  filters: Filter[];
  filterQuery: Query;
  timeRange?: TimeRange;
}) => {
  return {
    query: buildEsQuery(
      undefined,
      [
        {
          query: THREAT_QUERY_BASE,
          language: 'kuery',
        },
        {
          query: filterQuery.query as string,
          language: 'kuery',
        },
      ],
      [
        ...filters,
        {
          query: {
            range: {
              [TIMESTAMP_FIELD]: {
                gte: timeRange?.from,
                lte: timeRange?.to,
              },
            },
          },
          meta: {},
        },
      ]
    ),
  };
};
