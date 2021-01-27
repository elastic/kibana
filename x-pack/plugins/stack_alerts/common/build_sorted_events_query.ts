/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESSearchBody, ESSearchRequest } from '../../../typings/elasticsearch';
import { SortOrder } from '../../../typings/elasticsearch/aggregations';

type BuildSortedEventsQueryOpts = Pick<ESSearchBody, 'aggs' | 'track_total_hits'> &
  Pick<Required<ESSearchRequest>, 'index' | 'size'>;

export interface BuildSortedEventsQuery extends BuildSortedEventsQueryOpts {
  filter: unknown;
  from: string;
  to: string;
  sortOrder?: SortOrder | undefined;
  searchAfterSortId: string | number | undefined;
  timeField: string;
}

export const buildSortedEventsQuery = ({
  aggs,
  index,
  from,
  to,
  filter,
  size,
  searchAfterSortId,
  sortOrder,
  timeField,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  track_total_hits,
}: BuildSortedEventsQuery): ESSearchRequest => {
  const sortField = timeField;
  const docFields = [timeField].map((tstamp) => ({
    field: tstamp,
    format: 'strict_date_optional_time',
  }));

  const rangeFilter: unknown[] = [
    {
      range: {
        [timeField]: {
          lte: to,
          gte: from,
          format: 'strict_date_optional_time',
        },
      },
    },
  ];
  const filterWithTime = [filter, { bool: { filter: rangeFilter } }];

  const searchQuery = {
    allowNoIndices: true,
    index,
    size,
    ignoreUnavailable: true,
    track_total_hits: track_total_hits ?? false,
    body: {
      docvalue_fields: docFields,
      query: {
        bool: {
          filter: [
            ...filterWithTime,
            {
              match_all: {},
            },
          ],
        },
      },
      ...(aggs ? { aggs } : {}),
      sort: [
        {
          [sortField]: {
            order: sortOrder ?? 'asc',
          },
        },
      ],
    },
  };

  if (searchAfterSortId) {
    return {
      ...searchQuery,
      body: {
        ...searchQuery.body,
        search_after: [searchAfterSortId],
      },
    };
  }
  return searchQuery;
};
