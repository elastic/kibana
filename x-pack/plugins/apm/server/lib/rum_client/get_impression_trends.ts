/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getServicesProjection } from '../../../common/projections/services';
import { mergeProjection } from '../../../common/projections/util/merge_projection';
import {
  AGENT_NAME,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
} from '../../../common/elasticsearch_fieldnames';
import { IEnvOptions } from '../service_map/get_service_map';

export async function getImpressionTrends(options: IEnvOptions) {
  const { setup } = options;

  const projection = getServicesProjection({
    setup: { ...setup, uiFiltersES: [] },
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
        impressions: {
          auto_date_histogram: {
            field: '@timestamp',
            buckets: 50,
          },
          aggs: {
            trans_count: {
              value_count: {
                field: 'transaction.type',
              },
            },
          },
        },
      },
    },
  });

  const { client } = setup;

  const response = await client.search(params);

  const result = response.aggregations.impressions.buckets;
  return result.map(({ key, trans_count }) => ({
    x: key,
    y: trans_count.value,
  }));
}
