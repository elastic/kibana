/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeProjection } from '../../../common/utils/merge_projection';
import { SetupUX, UxUIFilters } from '../../../typings/ui_filters';
import { PERCENTILE_DEFAULT } from './core_web_vitals_query';
import { getRumPageLoadTransactionsProjection } from './projections';

const LONG_TASK_SUM_FIELD = 'transaction.experience.longtask.sum';
const LONG_TASK_COUNT_FIELD = 'transaction.experience.longtask.count';
const LONG_TASK_MAX_FIELD = 'transaction.experience.longtask.max';

export function longTaskMetricsQuery(
  start: number,
  end: number,
  percentile: number = PERCENTILE_DEFAULT,
  urlQuery?: string,
  uiFilters?: UxUIFilters
) {
  const setup: SetupUX = { uiFilters: uiFilters ? uiFilters : {} };
  const projection = getRumPageLoadTransactionsProjection({
    setup,
    urlQuery,
    start,
    end,
  });

  const params = mergeProjection(projection, {
    body: {
      size: 0,
      aggs: {
        longTaskSum: {
          percentiles: {
            field: LONG_TASK_SUM_FIELD,
            percents: [percentile],
            hdr: {
              number_of_significant_value_digits: 3,
            },
          },
        },
        longTaskCount: {
          percentiles: {
            field: LONG_TASK_COUNT_FIELD,
            percents: [percentile],
            hdr: {
              number_of_significant_value_digits: 3,
            },
          },
        },
        longTaskMax: {
          percentiles: {
            field: LONG_TASK_MAX_FIELD,
            percents: [percentile],
            hdr: {
              number_of_significant_value_digits: 3,
            },
          },
        },
      },
    },
  });

  return params;
}
