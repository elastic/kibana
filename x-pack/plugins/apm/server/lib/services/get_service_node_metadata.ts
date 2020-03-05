/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Setup,
  SetupTimeRange,
  SetupUIFilters
} from '../helpers/setup_request';
import {
  HOST_NAME,
  CONTAINER_ID
} from '../../../common/elasticsearch_fieldnames';
import { NOT_AVAILABLE_LABEL } from '../../../common/i18n';
import { mergeProjection } from '../../../common/projections/util/merge_projection';
import { getServiceNodesProjection } from '../../../common/projections/service_nodes';

export async function getServiceNodeMetadata({
  serviceName,
  serviceNodeName,
  setup
}: {
  serviceName: string;
  serviceNodeName: string;
  setup: Setup & SetupTimeRange & SetupUIFilters;
}) {
  const { client } = setup;

  const query = mergeProjection(
    getServiceNodesProjection({
      setup,
      serviceName,
      serviceNodeName
    }),
    {
      body: {
        size: 0,
        aggs: {
          host: {
            terms: {
              field: HOST_NAME,
              size: 1
            }
          },
          containerId: {
            terms: {
              field: CONTAINER_ID,
              size: 1
            }
          }
        }
      }
    }
  );

  const response = await client.search(query);

  return {
    host: response.aggregations?.host.buckets[0]?.key || NOT_AVAILABLE_LABEL,
    containerId:
      response.aggregations?.containerId.buckets[0]?.key || NOT_AVAILABLE_LABEL
  };
}
