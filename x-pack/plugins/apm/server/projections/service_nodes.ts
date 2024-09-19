/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SERVICE_NODE_NAME } from '../../common/elasticsearch_fieldnames';
import { mergeProjection } from './util/merge_projection';
import { getMetricsProjection } from './metrics';

export function getServiceNodesProjection({
  serviceName,
  serviceNodeName,
  environment,
  kuery,
  start,
  end,
}: {
  serviceName: string;
  serviceNodeName?: string;
  environment: string;
  kuery: string;
  start: number;
  end: number;
}) {
  return mergeProjection(
    getMetricsProjection({
      serviceName,
      serviceNodeName,
      environment,
      kuery,
      start,
      end,
    }),
    {
      body: {
        aggs: {
          nodes: {
            terms: {
              field: SERVICE_NODE_NAME,
            },
          },
        },
      },
    }
  );
}
