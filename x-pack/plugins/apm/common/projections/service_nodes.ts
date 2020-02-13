/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Setup,
  SetupTimeRange,
  SetupUIFilters
} from '../../server/lib/helpers/setup_request';
import { SERVICE_NODE_NAME } from '../elasticsearch_fieldnames';
import { mergeProjection } from './util/merge_projection';
import { getMetricsProjection } from './metrics';

export function getServiceNodesProjection({
  setup,
  serviceName,
  serviceNodeName
}: {
  setup: Setup & SetupTimeRange & SetupUIFilters;
  serviceName: string;
  serviceNodeName?: string;
}) {
  return mergeProjection(
    getMetricsProjection({
      setup,
      serviceName,
      serviceNodeName
    }),
    {
      body: {
        aggs: {
          nodes: {
            terms: {
              field: SERVICE_NODE_NAME
            }
          }
        }
      }
    }
  );
}
