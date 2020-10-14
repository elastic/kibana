/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getRumPageLoadTransactionsProjection } from '../../projections/rum_page_load_transactions';
import { mergeProjection } from '../../projections/util/merge_projection';
import { Setup, SetupTimeRange } from '../helpers/setup_request';
import {
  USER_AGENT_NAME,
  USER_AGENT_OS,
} from '../../../common/elasticsearch_fieldnames';

export async function getVisitorBreakdown({
  setup,
  urlQuery,
}: {
  setup: Setup & SetupTimeRange;
  urlQuery?: string;
}) {
  const projection = getRumPageLoadTransactionsProjection({
    setup,
    urlQuery,
  });

  const params = mergeProjection(projection, {
    body: {
      size: 0,
      track_total_hits: true,
      query: {
        bool: projection.body.query.bool,
      },
      aggs: {
        browsers: {
          terms: {
            field: USER_AGENT_NAME,
            size: 9,
          },
        },
        os: {
          terms: {
            field: USER_AGENT_OS,
            size: 9,
          },
        },
      },
    },
  });

  const { apmEventClient } = setup;

  const response = await apmEventClient.search(params);
  const { browsers, os } = response.aggregations!;

  const totalItems = response.hits.total.value;

  const browserTotal = browsers.buckets.reduce(
    (prevVal, item) => prevVal + item.doc_count,
    0
  );

  const osTotal = os.buckets.reduce(
    (prevVal, item) => prevVal + item.doc_count,
    0
  );

  const browserItems = browsers.buckets.map((bucket) => ({
    count: bucket.doc_count,
    name: bucket.key as string,
  }));

  if (totalItems > 0) {
    browserItems.push({
      count: totalItems - browserTotal,
      name: 'Others',
    });
  }

  const osItems = os.buckets.map((bucket) => ({
    count: bucket.doc_count,
    name: bucket.key as string,
  }));

  if (totalItems > 0) {
    osItems.push({
      count: totalItems - osTotal,
      name: 'Others',
    });
  }

  return {
    os: osItems,
    browsers: browserItems,
  };
}
