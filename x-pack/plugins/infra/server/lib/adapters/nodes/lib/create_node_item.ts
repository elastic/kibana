/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  InfraContainer,
  InfraHost,
  InfraHostMetrics,
  InfraPod,
} from '../../../../../common/types';
import {
  InfraBucket,
  InfraNode,
  InfraNodeRequestOptions,
  InfraNodeType,
} from '../../../infra_types';

// TODO: Break these function into seperate files and expand beyond just documnet count
// In the code below it looks like overkill to split these three functions out
// but in reality the create metrics functions will be different per node type.
function createHostMetrics(
  options: InfraNodeRequestOptions,
  node: InfraBucket,
  bucket: InfraBucket
): InfraHostMetrics {
  return { count: bucket.doc_count };
}

function createPodMetrics(
  options: InfraNodeRequestOptions,
  node: InfraBucket,
  bucket: InfraBucket
): InfraHostMetrics {
  return { count: bucket.doc_count };
}

function createContainerMetrics(
  options: InfraNodeRequestOptions,
  node: InfraBucket,
  bucket: InfraBucket
): InfraHostMetrics {
  return { count: bucket.doc_count };
}

export function createNodeItem(
  options: InfraNodeRequestOptions,
  node: InfraBucket,
  bucket: InfraBucket
): InfraNode {
  const { nodeType } = options;
  if (nodeType === InfraNodeType.host) {
    return {
      metrics: createHostMetrics(options, node, bucket),
      name: node.key,
      type: InfraNodeType.host,
    } as InfraHost;
  }

  if (nodeType === InfraNodeType.pod) {
    return {
      metrics: createPodMetrics(options, node, bucket),
      name: node.key,
      type: InfraNodeType.pod,
    } as InfraPod;
  }

  if (nodeType === InfraNodeType.container) {
    return {
      metrics: createContainerMetrics(options, node, bucket),
      name: node.key,
      type: InfraNodeType.container,
    } as InfraContainer;
  }

  throw new Error(`Unsupported node type: ${nodeType}.`);
}
