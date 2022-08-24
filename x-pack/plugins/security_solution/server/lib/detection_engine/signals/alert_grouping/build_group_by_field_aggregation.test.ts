/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { TIMESTAMP } from '@kbn/rule-data-utils';
import { buildGroupByFieldAggregation } from './build_group_by_field_aggregation';

describe('build_group_by_field_aggregation', () => {
  it('Build Group-by-field aggregation', () => {
    const groupByFields = ['host.name'];
    const maxSignals = 100;
    const sort: estypes.Sort = [
      {
        [TIMESTAMP]: {
          order: 'desc',
          unmapped_type: 'date',
        },
      },
    ];

    const agg = buildGroupByFieldAggregation({
      groupByFields,
      maxSignals,
      sort,
    });
    expect(agg).toEqual({
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
  });
});
