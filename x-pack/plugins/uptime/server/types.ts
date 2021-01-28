/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { IRouter, RequestHandlerContext } from 'src/core/server';
import type { AlertingApiRequestHandlerContext } from '../../alerts/server';
import type { LicensingApiRequestHandlerContext } from '../../licensing/server';
/**
 * @internal
 */
export interface UptimeRequestHandlerContext extends RequestHandlerContext {
  licensing: LicensingApiRequestHandlerContext;
  alerting: AlertingApiRequestHandlerContext;
}

/**
 * @internal
 */
export type UptimeRouter = IRouter<UptimeRequestHandlerContext>;
