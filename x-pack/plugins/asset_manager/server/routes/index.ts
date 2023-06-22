/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandlerContext } from '@kbn/core/server';
import { SetupRouteOptions } from './types';
import { pingRoute } from './ping';
import { assetsRoutes } from './assets';
import { sampleAssetsRoutes } from './sample_assets';

export function setupRoutes<T extends RequestHandlerContext>({ router }: SetupRouteOptions<T>) {
  pingRoute<T>({ router });
  assetsRoutes<T>({ router });
  sampleAssetsRoutes<T>({ router });
}
