/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { set } from 'lodash';
import { InfraResponse } from '../../../../../common/types';
import {
  InfraBucket,
  InfraNode,
  InfraNodeRequestOptions,
} from '../../../../../server/lib/infra_types';
import { convertNodesResponseToGroups } from './convert_nodes_response_to_groups';
import { createNodeItem } from './create_node_item';

export function processNodes(
  options: InfraNodeRequestOptions,
  nodes: any[]
): InfraResponse {
  const response: InfraResponse = {};

  if (options.groupBy.length === 0) {
    // If there are NO group by options then we need to return a
    // nodes only response
    const nodeResults: InfraNode[] = nodes.map(
      (node: InfraBucket): InfraNode => {
        return createNodeItem(options, node, node);
      }
    );
    set(response, options.nodesKey, nodeResults);
    return response;
  } else {
    // Return a grouped response
    response.groups = convertNodesResponseToGroups(options, nodes);
  }

  return response;
}
