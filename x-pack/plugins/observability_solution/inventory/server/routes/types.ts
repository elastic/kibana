/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomRequestHandlerContext, KibanaRequest } from '@kbn/core/server';
import type { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server/types';
import type { Logger } from '@kbn/logging';
import type { InventorySetupDependencies, InventoryStartDependencies } from '../types';

export type InventoryRequestHandlerContext = CustomRequestHandlerContext<{
  licensing: Pick<LicensingApiRequestHandlerContext, 'license' | 'featureUsage'>;
}>;

export interface InventoryRouteHandlerResources {
  request: KibanaRequest;
  context: InventoryRequestHandlerContext;
  logger: Logger;
  plugins: {
    [key in keyof InventorySetupDependencies]: {
      setup: Required<InventorySetupDependencies>[key];
    };
  } & {
    [key in keyof InventoryStartDependencies]: {
      start: () => Promise<Required<InventoryStartDependencies>[key]>;
    };
  };
}

export interface InventoryRouteCreateOptions {
  timeout?: {
    idleSocket?: number;
  };
  tags: Array<'access:inventory'>;
}
