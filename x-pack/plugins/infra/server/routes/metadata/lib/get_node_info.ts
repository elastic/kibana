/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@elastic/safer-lodash-set';
import { first, startsWith } from 'lodash';
import type { InfraPluginRequestHandlerContext } from '../../../types';
import { KibanaFramework } from '../../../lib/adapters/framework/kibana_framework_adapter';
import { InfraSourceConfiguration } from '../../../lib/sources';
import { InfraMetadataInfo } from '../../../../common/http_api/metadata_api';
import { getPodNodeName } from './get_pod_node_name';
import { CLOUD_METRICS_MODULES } from '../../../lib/constants';
import { findInventoryFields } from '../../../../common/inventory_models';
import { InventoryItemType } from '../../../../common/inventory_models/types';
import { TIMESTAMP_FIELD } from '../../../../common/constants';

export const getNodeInfo = async (
  framework: KibanaFramework,
  requestContext: InfraPluginRequestHandlerContext,
  sourceConfiguration: InfraSourceConfiguration,
  nodeId: string,
  nodeType: InventoryItemType,
  timeRange: { from: number; to: number }
): Promise<InfraMetadataInfo> => {
  // If the nodeType is a Kubernetes pod then we need to get the node info
  // from a host record instead of a pod. This is due to the fact that any host
  // can report pod details and we can't rely on the host/cloud information associated
  // with the kubernetes.pod.uid. We need to first lookup the `kubernetes.node.name`
  // then use that to lookup the host's node information.
  if (nodeType === 'pod') {
    const kubernetesNodeName = await getPodNodeName(
      framework,
      requestContext,
      sourceConfiguration,
      nodeId,
      nodeType,
      timeRange
    );
    if (kubernetesNodeName) {
      return getNodeInfo(
        framework,
        requestContext,
        sourceConfiguration,
        kubernetesNodeName,
        'host',
        timeRange
      );
    }
    return {};
  }
  const fields = findInventoryFields(nodeType);
  const params = {
    allow_no_indices: true,
    ignore_unavailable: true,
    terminate_after: 1,
    index: sourceConfiguration.metricAlias,
    body: {
      size: 1,
      _source: ['host.*', 'cloud.*', 'agent.*'],
      sort: [{ [TIMESTAMP_FIELD]: 'desc' }],
      query: {
        bool: {
          filter: [
            { match: { [fields.id]: nodeId } },
            {
              range: {
                [TIMESTAMP_FIELD]: {
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
  if (!CLOUD_METRICS_MODULES.some((m) => startsWith(nodeType, m))) {
    set(
      params,
      'body.query.bool.must_not',
      CLOUD_METRICS_MODULES.map((module) => ({ match: { 'event.module': module } }))
    );
  }
  const response = await framework.callWithRequest<{ _source: InfraMetadataInfo }, {}>(
    requestContext,
    'search',
    params
  );
  const firstHit = first(response.hits.hits);
  if (firstHit) {
    return firstHit._source;
  }
  return {};
};
