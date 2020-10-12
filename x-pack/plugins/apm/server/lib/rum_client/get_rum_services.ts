/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SERVICE_NAME } from '../../../common/elasticsearch_fieldnames';
import { Setup, SetupTimeRange } from '../helpers/setup_request';
import { getRumPageLoadTransactionsProjection } from '../../projections/rum_page_load_transactions';
import { mergeProjection } from '../../projections/util/merge_projection';

export async function getRumServices({
  setup,
}: {
  setup: Setup & SetupTimeRange;
}) {
  const projection = getRumPageLoadTransactionsProjection({
    setup,
  });

  const params = mergeProjection(projection, {
    body: {
      size: 0,
      query: {
        bool: projection.body.query.bool,
      },
      aggs: {
        services: {
          terms: {
            field: SERVICE_NAME,
            size: 1000,
          },
        },
      },
    },
  });

  const { apmEventClient } = setup;

  const response = await apmEventClient.search(params);

  const result = response.aggregations?.services.buckets ?? [];

  return result.map(({ key }) => key as string);
}
