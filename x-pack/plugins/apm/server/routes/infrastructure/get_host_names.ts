/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { rangeQuery } from '@kbn/observability-plugin/server';
import { InfraPluginStart, InfraPluginSetup } from '@kbn/infra-plugin/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  CONTAINER_ID,
  HOST_NAME,
} from '../../../common/elasticsearch_fieldnames';
import { ApmPluginRequestHandlerContext } from '../typings';
import { getMetricIndices } from '../../lib/helpers/get_metric_indices';

interface Aggs extends estypes.AggregationsMultiBucketAggregateBase {
  buckets: Array<{
    key: string;
    key_as_string?: string;
  }>;
}

interface InfraPlugin {
  setup: InfraPluginSetup;
  start: () => Promise<InfraPluginStart>;
}

const getHostNames = async ({
  esClient,
  containerIds,
  index,
  start,
  end,
}: {
  esClient: ElasticsearchClient;
  containerIds: string[];
  index: string;
  start: number;
  end: number;
}) => {
  const response = await esClient.search<unknown, { hostNames: Aggs }>({
    index: [index],
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
  context,
  infra,
  start,
  end,
}: {
  containerIds: string[];
  context: ApmPluginRequestHandlerContext;
  infra: InfraPlugin;
  start: number;
  end: number;
}): Promise<string[]> => {
  if (containerIds.length) {
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const savedObjectsClient = (await context.core).savedObjects.client;
    const metricIndices = await getMetricIndices({
      infraPlugin: infra,
      savedObjectsClient,
    });

    const containerHostNames = await getHostNames({
      esClient,
      containerIds,
      index: metricIndices,
      start,
      end,
    });
    return containerHostNames.hostNames;
  }
  return [];
};
