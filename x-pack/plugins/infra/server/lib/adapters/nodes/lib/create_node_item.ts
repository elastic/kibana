/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraNode, InfraNodeMetric } from '../../../../../common/graphql/types';
import { InfraBucket, InfraNodeRequestOptions } from '../adapter_types';

// TODO: Break these function into seperate files and expand beyond just documnet count
// In the code below it looks like overkill to split these three functions out
// but in reality the create metrics functions will be different per node type.
function createNodeMetrics(
  options: InfraNodeRequestOptions,
  node: InfraBucket,
  bucket: InfraBucket
): InfraNodeMetric[] {
  return [{ id: '1', name: 'count', value: bucket.doc_count }];
}

export function createNodeItem(
  options: InfraNodeRequestOptions,
  node: InfraBucket,
  bucket: InfraBucket
): InfraNode {
  return {
    metrics: createNodeMetrics(options, node, bucket),
    path: [{ id: options.nodeField, value: node.key }],
  } as InfraNode;
}
