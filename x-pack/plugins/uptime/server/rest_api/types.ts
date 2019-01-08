/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMServerLibs } from '../lib/lib';

export interface UMServerRoute {
  method: string;
  path: string;
  options?: any;
  handler: (request: any, h?: any) => any;
}

export type UMRestApiRouteCreator = (libs: UMServerLibs) => UMServerRoute;
