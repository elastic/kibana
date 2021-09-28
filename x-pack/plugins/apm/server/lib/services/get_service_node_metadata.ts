/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Setup } from '../helpers/setup_request';
import {
  HOST_NAME,
  CONTAINER_ID,
} from '../../../common/elasticsearch_fieldnames';
import { NOT_AVAILABLE_LABEL } from '../../../common/i18n';
import { mergeProjection } from '../../projections/util/merge_projection';
import { getServiceNodesProjection } from '../../projections/service_nodes';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';

export async function getServiceNodeMetadata({
  kuery,
  serviceName,
  serviceNodeName,
  setup,
  start,
  end,
}: {
  kuery: string;
  serviceName: string;
  serviceNodeName: string;
  setup: Setup;
  start: number;
  end: number;
}) {
  const { apmEventClient } = setup;

  const query = mergeProjection(
    getServiceNodesProjection({
      kuery,
      serviceName,
      serviceNodeName,
      environment: ENVIRONMENT_ALL.value,
      start,
      end,
    }),
    {
      body: {
        size: 0,
        aggs: {
          host: {
            terms: {
              field: HOST_NAME,
              size: 1,
            },
          },
          containerId: {
            terms: {
              field: CONTAINER_ID,
              size: 1,
            },
          },
        },
      },
    }
  );

  const response = await apmEventClient.search(
    'get_service_node_metadata',
    query
  );

  return {
    host: response.aggregations?.host.buckets[0]?.key || NOT_AVAILABLE_LABEL,
    containerId:
      response.aggregations?.containerId.buckets[0]?.key || NOT_AVAILABLE_LABEL,
  };
}
