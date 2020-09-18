/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export type NodeDataRole = 'data' | 'data_hot' | 'data_warm' | 'data_cold' | 'data_frozen';

export interface ListNodesRouteResponse {
  nodesByAttributes: { [attributePair: string]: string[] };
  nodesByRoles: { [role in NodeDataRole]?: string[] };
}
