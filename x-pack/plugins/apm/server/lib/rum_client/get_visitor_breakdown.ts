/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getRumOverviewProjection } from '../../../common/projections/rum_overview';
import { mergeProjection } from '../../../common/projections/util/merge_projection';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters,
} from '../helpers/setup_request';
import {
  USER_AGENT_DEVICE,
  USER_AGENT_NAME,
  USER_AGENT_OS,
} from '../../../common/elasticsearch_fieldnames';

export async function getVisitorBreakdown({
  setup,
}: {
  setup: Setup & SetupTimeRange & SetupUIFilters;
}) {
  const projection = getRumOverviewProjection({
    setup,
  });

  const params = mergeProjection(projection, {
    body: {
      size: 0,
      query: {
        bool: projection.body.query.bool,
      },
      aggs: {
        browsers: {
          terms: {
            field: USER_AGENT_NAME,
            size: 10,
          },
        },
        os: {
          terms: {
            field: USER_AGENT_OS,
            size: 10,
          },
        },
        devices: {
          terms: {
            field: USER_AGENT_DEVICE,
            size: 10,
          },
        },
      },
    },
  });

  const { client } = setup;

  const response = await client.search(params);
  const { browsers, os, devices } = response.aggregations!;

  return {
    browsers: browsers.buckets.map((bucket) => ({
      count: bucket.doc_count,
      name: bucket.key as string,
    })),
    os: os.buckets.map((bucket) => ({
      count: bucket.doc_count,
      name: bucket.key as string,
    })),
    devices: devices.buckets.map((bucket) => ({
      count: bucket.doc_count,
      name: bucket.key as string,
    })),
  };
}
