/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NodeDataRoleWithCatchAll } from '.';

export interface ListNodesRouteResponse {
  nodesByAttributes: { [attributePair: string]: string[] };
  nodesByRoles: { [role in NodeDataRoleWithCatchAll]?: string[] };

  /**
   * A flag to indicate whether a node is using `settings.node.data` which is the now deprecated way cloud configured
   * nodes to have data (and other) roles.
   *
   * If this is true, it means the cluster is using legacy cloud configuration for data allocation, not node roles.
   */
  isUsingDeprecatedDataRoleConfig: boolean;
}
