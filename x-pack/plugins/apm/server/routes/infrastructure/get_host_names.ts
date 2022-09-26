/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery } from '@kbn/observability-plugin/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  CONTAINER_ID,
  HOST_NAME,
} from '../../../common/elasticsearch_fieldnames';
import { Setup } from '../../lib/helpers/setup_request';
import { InfraClient } from '../../lib/helpers/create_es_client/create_infra_metrics_client/create_infra_metrics_client';

interface Aggs extends estypes.AggregationsMultiBucketAggregateBase {
  buckets: Array<{
    key: string;
    key_as_string?: string;
  }>;
}

const getHostNames = async ({
  infraMetricsClient,
  containerIds,
  start,
  end,
}: {
  infraMetricsClient: InfraClient;
  containerIds: string[];
  start: number;
  end: number;
}) => {
  const response = await infraMetricsClient.search<
    unknown,
    { hostNames: Aggs }
  >({
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            {
              terms: {
                [CONTAINER_ID]: containerIds,
              },
            },
            ...rangeQuery(start, end),
          ],
        },
      },
      aggs: {
        hostNames: {
          terms: {
            field: HOST_NAME,
            size: 500,
          },
        },
      },
    },
  });

  return {
    hostNames:
      response.aggregations?.hostNames?.buckets.map(
        (bucket) => bucket.key as string
      ) ?? [],
  };
};

export const getContainerHostNames = async ({
  containerIds,
  setup,
  start,
  end,
}: {
  containerIds: string[];
  setup: Setup;
  start: number;
  end: number;
}): Promise<string[]> => {
  if (containerIds.length) {
    const { infraMetricsClient } = setup;

    const containerHostNames = await getHostNames({
      infraMetricsClient,
      containerIds,
      start,
      end,
    });
    return containerHostNames.hostNames;
  }
  return [];
};
