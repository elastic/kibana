/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { first, get } from 'lodash';
import { KibanaFramework } from '../../../lib/adapters/framework/kibana_framework_adapter';
import { InfraSourceConfiguration } from '../../../lib/sources';
import { findInventoryFields } from '../../../../common/inventory_models';
import type { InfraPluginRequestHandlerContext } from '../../../types';

export const getPodNodeName = async (
  framework: KibanaFramework,
  requestContext: InfraPluginRequestHandlerContext,
  sourceConfiguration: InfraSourceConfiguration,
  nodeId: string,
  nodeType: 'host' | 'pod' | 'container',
  timeRange: { from: number; to: number }
): Promise<string | undefined> => {
  const fields = findInventoryFields(nodeType, sourceConfiguration.fields);
  const timestampField = sourceConfiguration.fields.timestamp;
  const params = {
    allowNoIndices: true,
    ignoreUnavailable: true,
    terminateAfter: 1,
    index: sourceConfiguration.metricAlias,
    body: {
      size: 1,
      _source: ['kubernetes.node.name'],
      sort: [{ [timestampField]: 'desc' }],
      query: {
        bool: {
          filter: [
            { match: { [fields.id]: nodeId } },
            { exists: { field: `kubernetes.node.name` } },
            {
              range: {
                [timestampField]: {
                  gte: timeRange.from,
                  lte: timeRange.to,
                  format: 'epoch_millis',
                },
              },
            },
          ],
        },
      },
    },
  };
  const response = await framework.callWithRequest<
    { _source: { kubernetes: { node: { name: string } } } },
    {}
  >(requestContext, 'search', params);
  const firstHit = first(response.hits.hits);
  if (firstHit) {
    return get(firstHit, '_source.kubernetes.node.name');
  }
};
