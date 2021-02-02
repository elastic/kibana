/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ml } from '../services/ml_api_service';
import { MlNodeCount } from '../../../common/types/ml_server_info';

let mlNodeCount: number = 0;
let lazyMlNodeCount: number = 0;
let userHasPermissionToViewMlNodeCount: boolean = false;

export async function checkMlNodesAvailable(redirectToJobsManagementPage: () => Promise<void>) {
  try {
    const { count, lazyNodeCount } = await getMlNodeCount();
    if (count > 0 || lazyNodeCount > 0) {
      Promise.resolve();
    } else {
      throw Error('Cannot load count of ML nodes');
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    await redirectToJobsManagementPage();
    Promise.reject();
  }
}

export async function getMlNodeCount(): Promise<MlNodeCount> {
  try {
    const nodes = await ml.mlNodeCount();
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

export function permissionToViewMlNodeCount() {
  return userHasPermissionToViewMlNodeCount;
}
