/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TRANSACTION_DURATION } from '../../../common/elasticsearch_fieldnames';
import { getRumPageLoadTransactionsProjection } from '../../projections/rum_page_load_transactions';
import { mergeProjection } from '../../projections/util/merge_projection';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters,
} from '../helpers/setup_request';
import {
  TRANSACTION_DOM_INTERACTIVE,
  TRANSACTION_TIME_TO_FIRST_BYTE,
} from '../../../common/elasticsearch_fieldnames';

export async function getClientMetrics({
  setup,
  urlQuery,
}: {
  setup: Setup & SetupTimeRange & SetupUIFilters;
  urlQuery?: string;
}) {
  const projection = getRumPageLoadTransactionsProjection({
    setup,
    urlQuery,
  });

  const params = mergeProjection(projection, {
    body: {
      size: 0,
      aggs: {
        pageViews: {
          value_count: {
            field: TRANSACTION_DURATION,
          },
        },
        backEnd: {
          percentiles: {
            field: TRANSACTION_TIME_TO_FIRST_BYTE,
            percents: [50],
            hdr: {
              number_of_significant_value_digits: 3,
            },
          },
        },
        domInteractive: {
          percentiles: {
            field: TRANSACTION_DOM_INTERACTIVE,
            percents: [50],
            hdr: {
              number_of_significant_value_digits: 3,
            },
          },
        },
      },
    },
  });

  const { apmEventClient } = setup;

  const response = await apmEventClient.search(params);
  const { backEnd, domInteractive, pageViews } = response.aggregations!;

  // Divide by 1000 to convert ms into seconds
  return {
    pageViews,
    backEnd: { value: backEnd.values['50.0'] || 0 },
    frontEnd: {
      value:
        (domInteractive.values['50.0'] || 0) - (backEnd.values['50.0'] || 0),
    },
  };
}
