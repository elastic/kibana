/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, IRouter } from 'kibana/server';
import { setupEndpointListApi } from './endpoint_list';
import { setupEndpointDetailApi } from './endpoint_detail';

export function setupEndpointsApi(router: IRouter, coreSetup: CoreSetup): void {
  setupEndpointListApi(router, coreSetup);
  setupEndpointDetailApi(router, coreSetup);
}
