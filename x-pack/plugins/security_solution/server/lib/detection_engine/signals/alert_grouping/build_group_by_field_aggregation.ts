/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

interface GetGroupByFieldAggregationArgs {
  groupByFields: string[];
  maxSignals: number;
  sort: estypes.Sort;
}

export const buildGroupByFieldAggregation = ({
  groupByFields,
  maxSignals,
  sort,
}: GetGroupByFieldAggregationArgs) => ({
  eventGroups: {
    terms: {
      field: groupByFields[0],
      size: maxSignals,
      min_doc_count: 1,
    },
    aggs: {
      topHits: {
        top_hits: {
          sort,
          size: maxSignals,
        },
      },
    },
  },
});
