/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraNode } from '../../../../../common/graphql/types';
import { InfraBucket, InfraNodeRequestOptions } from '../adapter_types';
import { convertNodesResponseToGroups } from './convert_nodes_response_to_groups';
import { createNodeItem } from './create_node_item';

export function processNodes(options: InfraNodeRequestOptions, nodes: any[]): InfraNode[] {
  if (options.groupBy.length === 0) {
    // If there are NO group by options then we need to return a
    // nodes only response
    const nodeResults: InfraNode[] = nodes.map(
      (node: InfraBucket): InfraNode => {
        return createNodeItem(options, node, node);
      }
    );
    return nodeResults;
  }

  // Return a grouped response
  return convertNodesResponseToGroups(options, nodes);
}
