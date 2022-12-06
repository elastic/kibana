/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LicensingApiRequestHandlerContext,
  LicensingPluginStart,
} from '@kbn/licensing-plugin/server';
import { CustomRequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import { IRouter } from '@kbn/core/server';

export interface Dependencies {
  licensing: LicensingPluginStart;
}

export type CustomBrandingRequestHandlerContext = CustomRequestHandlerContext<{
  licensing: LicensingApiRequestHandlerContext;
}>;
export type CustomBrandingRouter = IRouter<CustomBrandingRequestHandlerContext>;
