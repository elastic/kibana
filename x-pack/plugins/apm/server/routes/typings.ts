/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoreSetup,
  CustomRequestHandlerContext,
  Logger,
  KibanaRequest,
  CoreStart,
} from '@kbn/core/server';
import { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import { AlertingApiRequestHandlerContext } from '@kbn/alerting-plugin/server';
import type { RacApiRequestHandlerContext } from '@kbn/rule-registry-plugin/server';
import { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { APMConfig } from '..';
import {
  APMPluginSetupDependencies,
  APMPluginStartDependencies,
} from '../types';

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
    >;
    body?: { accepts: Array<'application/json' | 'multipart/form-data'> };
    disableTelemetry?: boolean;
  };
}

export type TelemetryUsageCounter = ReturnType<
  UsageCollectionSetup['createUsageCounter']
>;

export interface APMCore {
  setup: CoreSetup;
  start: () => Promise<CoreStart>;
}

export interface APMRouteHandlerResources {
  request: KibanaRequest;
  context: ApmPluginRequestHandlerContext;
  params: {
    query: {
      _inspect: boolean;
      start?: number;
      end?: number;
    };
  };
  config: APMConfig;
  logger: Logger;
  core: APMCore;
  plugins: {
    [key in keyof APMPluginSetupDependencies]: {
      setup: Required<APMPluginSetupDependencies>[key];
      start: () => Promise<Required<APMPluginStartDependencies>[key]>;
    };
  };
  ruleDataClient: IRuleDataClient;
  telemetryUsageCounter?: TelemetryUsageCounter;
  kibanaVersion: string;
}
