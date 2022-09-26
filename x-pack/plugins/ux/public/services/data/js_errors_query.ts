/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeProjection } from '../../../common/utils/merge_projection';
import { SetupUX, UxUIFilters } from '../../../typings/ui_filters';
import {
  ERROR_EXC_MESSAGE,
  ERROR_EXC_TYPE,
  ERROR_GROUP_ID,
  TRANSACTION_ID,
  TRANSACTION_TYPE,
} from '../../../common/elasticsearch_fieldnames';
import { TRANSACTION_PAGE_LOAD } from '../../../common/transaction_types';
import { getRumErrorsProjection } from './projections';

export function jsErrorsQuery(
  start: number,
  end: number,
  pageSize: number,
  pageIndex: number,
  urlQuery?: string,
  uiFilters?: UxUIFilters
) {
  const setup: SetupUX = { uiFilters: uiFilters ? uiFilters : {} };
  const projection = getRumErrorsProjection({
    setup,
    urlQuery,
    start,
    end,
  });

  const params = mergeProjection(projection, {
    body: {
      size: 0,
      track_total_hits: true,
      aggs: {
        totalErrorGroups: {
          cardinality: {
            field: ERROR_GROUP_ID,
          },
        },
        totalErrorPages: {
          cardinality: {
            field: TRANSACTION_ID,
          },
        },
        errors: {
          terms: {
            field: ERROR_GROUP_ID,
            size: 500,
          },
          aggs: {
            bucket_truncate: {
              bucket_sort: {
                size: pageSize,
                from: pageIndex * pageSize,
              },
            },
            impactedPages: {
              filter: {
                term: {
                  [TRANSACTION_TYPE]: TRANSACTION_PAGE_LOAD,
                },
              },
              aggs: {
                pageCount: {
                  cardinality: {
                    field: TRANSACTION_ID,
                  },
                },
              },
            },
            sample: {
              top_hits: {
                _source: [
                  ERROR_EXC_MESSAGE,
                  ERROR_EXC_TYPE,
                  ERROR_GROUP_ID,
                  '@timestamp',
                ],
                sort: [{ '@timestamp': 'desc' as const }],
                size: 1,
              },
            },
          },
        },
      },
    },
  });

  return params;
}
