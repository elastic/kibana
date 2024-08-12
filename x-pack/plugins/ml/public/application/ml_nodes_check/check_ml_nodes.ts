/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ml } from '../services/ml_api_service';
import type { MlApiServices } from '../services/ml_api_service';
import type { MlNodeCount } from '../../../common/types/ml_server_info';

let mlNodeCount: number = 0;
let lazyMlNodeCount: number = 0;
let userHasPermissionToViewMlNodeCount: boolean = false;

export async function getMlNodeCount(mlApiServices?: MlApiServices): Promise<MlNodeCount> {
  try {
    const nodes = await (mlApiServices ?? ml).mlNodeCount();
    mlNodeCount = nodes.count;
    lazyMlNodeCount = nodes.lazyNodeCount;
    userHasPermissionToViewMlNodeCount = true;
    return nodes;
  } catch (error) {
    mlNodeCount = 0;
    if (error.statusCode === 403) {
      userHasPermissionToViewMlNodeCount = false;
    }
    return { count: 0, lazyNodeCount: 0 };
  }
}

export function mlNodesAvailable() {
  return mlNodeCount !== 0 || lazyMlNodeCount !== 0;
}

export function currentMlNodesAvailable() {
  return mlNodeCount !== 0;
}

export function lazyMlNodesAvailable() {
  return lazyMlNodeCount !== 0;
}

export function permissionToViewMlNodeCount() {
  return userHasPermissionToViewMlNodeCount;
}

export function getMlNodesCount(): number {
  return mlNodeCount;
}
