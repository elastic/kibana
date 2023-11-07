/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { termQuery, rangeQuery } from '@kbn/observability-plugin/server';
import datemath from '@kbn/datemath';
import { METRICSET_NAME } from '../../../../common/es_fields/apm';
import { APMInternalESClient } from '../../../lib/helpers/create_es_client/create_internal_es_client';

export async function getConfigsAppliedToAgentsThroughFleet(
  internalESClient: APMInternalESClient
) {
  const params = {
    index: internalESClient.apmIndices.metric,
    size: 0,
    body: {
      query: {
        bool: {
          filter: [
            ...termQuery(METRICSET_NAME, 'agent_config'),
            ...rangeQuery(
              datemath.parse('now-15m')!.valueOf(),
              datemath.parse('now')!.valueOf()
            ),
          ],
        },
      },
      aggs: {
        config_by_etag: {
          terms: {
            field: 'labels.etag',
            size: 200,
          },
        },
      },
    },
  };

  const response = await internalESClient.search(
    'get_config_applied_to_agent_through_fleet',
    params
  );

  return (
    response.aggregations?.config_by_etag.buckets.reduce(
      (configsAppliedToAgentsThroughFleet, bucket) => {
        configsAppliedToAgentsThroughFleet[bucket.key as string] = true;
        return configsAppliedToAgentsThroughFleet;
      },
      {} as Record<string, true>
    ) ?? {}
  );
}
