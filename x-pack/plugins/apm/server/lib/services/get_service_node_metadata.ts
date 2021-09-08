/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  CONTAINER_ID,
  HOST_NAME,
} from '../../../common/elasticsearch_fieldnames';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import { NOT_AVAILABLE_LABEL } from '../../../common/i18n';
import { getServiceNodesProjection } from '../../projections/service_nodes';
import { mergeProjection } from '../../projections/util/merge_projection';
import type { Setup, SetupTimeRange } from '../helpers/setup_request';

export async function getServiceNodeMetadata({
  kuery,
  serviceName,
  serviceNodeName,
  setup,
}: {
  kuery: string;
  serviceName: string;
  serviceNodeName: string;
  setup: Setup & SetupTimeRange;
}) {
  const { apmEventClient } = setup;

  const query = mergeProjection(
    getServiceNodesProjection({
      kuery,
      setup,
      serviceName,
      serviceNodeName,
      environment: ENVIRONMENT_ALL.value,
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
