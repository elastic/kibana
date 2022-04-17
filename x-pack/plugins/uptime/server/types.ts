/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, RequestHandlerContext } from '@kbn/core/server';
import type { AlertingApiRequestHandlerContext } from '@kbn/alerting-plugin/server';
import type { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server';
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
