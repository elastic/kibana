/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getRumErrorsProjection } from '../../projections/rum_overview';
import { mergeProjection } from '../../projections/util/merge_projection';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters,
} from '../helpers/setup_request';

export async function getJSErrors({
  setup,
  pageSize,
  pageIndex,
}: {
  setup: Setup & SetupTimeRange & SetupUIFilters;
  pageSize: number;
  pageIndex: number;
}) {
  const projection = getRumErrorsProjection({
    setup,
  });

  const params = mergeProjection(projection, {
    body: {
      size: pageSize,
      from: pageSize * pageIndex,
      query: {
        bool: {
          filter: [
            ...projection.body.query.bool.filter,
            {
              term: {
                'service.language.name': 'javascript',
              },
            },
          ],
        },
      },
      collapse: {
        field: 'error.grouping_key',
        inner_hits: {
          name: 'errorInfo',
          size: 0,
        },
      },
    },
  });

  const { apmEventClient } = setup;

  const response = await apmEventClient.search(params);

  return {
    total: response.hits.total.value,
    items: response.hits.hits.map((hit) => {
      return {
        errorMessage: hit._source.error.exception[0].message,
        count: hit.inner_hits.errorInfo.hits.total.value,
      };
    }),
  };
}
