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

export async function getClientMetrics({
  setup,
}: {
  setup: Setup & SetupTimeRange & SetupUIFilters;
}) {
  const projection = getRumOverviewProjection({
    setup,
  });

  const { filter } = projection.body.query.bool;

  const params = mergeProjection(projection, {
    body: {
      size: 0,
      query: {
        bool: {
          ...projection.body.query.bool,
          filter: filter.concat({
            term: {
              'transaction.type': 'page-load',
            },
          }),
        },
      },
      aggs: {
        pageViews: { value_count: { field: 'transaction.type' } },
        backEnd: {
          avg: {
            field: 'transaction.marks.agent.timeToFirstByte',
            missing: 0,
          },
        },
        frontEnd: {
          avg: {
            script: {
              lang: 'painless',
              source: `
              if(doc[\'transaction.marks.agent.timeToFirstByte\'].size()!==0 &&  doc[\'transaction.marks.agent.domInteractive\'].size()!==0)  {
                  doc[\'transaction.marks.agent.domInteractive\'].value - doc[\'transaction.marks.agent.timeToFirstByte\'].value
              }`,
            },
          },
        },
      },
    },
  });

  const { client } = setup;

  const response = await client.search(params);

  return response.aggregations;
}
