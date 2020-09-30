/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters,
} from '../helpers/setup_request';
import { SERVICE_NAME } from '../../../common/elasticsearch_fieldnames';
import { getRumPageLoadTransactionsProjection } from '../../projections/rum_page_load_transactions';
import { mergeProjection } from '../../projections/util/merge_projection';

export async function hasRumData({
  setup,
}: {
  setup: Setup & SetupTimeRange & SetupUIFilters;
}) {
  try {
    const projection = getRumPageLoadTransactionsProjection({
      setup,
    });

    const params = mergeProjection(projection, {
      body: {
        size: 0,
        aggs: {
          services: {
            terms: {
              field: SERVICE_NAME,
              size: 1,
            },
          },
        },
      },
    });

    const { apmEventClient } = setup;

    const response = await apmEventClient.search(params);
    return {
      hasData: response.hits.total.value > 0,
      serviceName: response.aggregations?.services?.buckets?.[0]?.key,
    };
  } catch (e) {
    return false;
  }
}
