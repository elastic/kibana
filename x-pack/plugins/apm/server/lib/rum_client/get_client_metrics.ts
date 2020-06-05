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

export async function getClientMetrics(options: IEnvOptions) {
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
          filter: options.serviceName
            ? filter.concat({
                term: {
                  [SERVICE_NAME]: options.serviceName,
                },
              })
            : filter,
        },
      },
      aggs: {
        metrics: {
          stats: {
            field: 'transaction.marks.agent.timeToFirstByte',
            // field: projection.body.aggs.services.terms.field,
            missing: 0,
          },
        },
      },
    },
  });

  const { client } = setup;

  const response = await client.search(params);

  return response.aggregations?.metrics;
}
