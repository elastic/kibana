/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoreSetup,
  CustomRequestHandlerContext,
  CoreStart,
  RouteConfigOptions,
} from '@kbn/core/server';
import { AlertingApiRequestHandlerContext } from '@kbn/alerting-plugin/server';
import type { RacApiRequestHandlerContext } from '@kbn/rule-registry-plugin/server';
import { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';

export type ApmPluginRequestHandlerContext = CustomRequestHandlerContext<{
  licensing: LicensingApiRequestHandlerContext;
  alerting: AlertingApiRequestHandlerContext;
  rac: RacApiRequestHandlerContext;
}>;

export interface APMRouteCreateOptions {
  options: {
    tags: Array<
      | 'access:apm'
      | 'access:apm_write'
      | 'access:ml:canGetJobs'
      | 'access:ml:canCreateJob'
      | 'access:ml:canCloseJob'
      | 'access:ai_assistant'
    >;
    body?: { accepts: Array<'application/json' | 'multipart/form-data'> };
    disableTelemetry?: boolean;
  } & RouteConfigOptions<any>;
}

export type TelemetryUsageCounter = ReturnType<
  UsageCollectionSetup['createUsageCounter']
>;

export interface APMCore {
  setup: CoreSetup;
  start: () => Promise<CoreStart>;
}
