/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  CoreSetup,
  CoreStart,
  Logger,
  RequestHandlerContext,
} from 'src/core/server';
import { KibanaRequest } from 'src/core/server';
import type { APMConfig } from '..';
import type { UsageCollectionSetup } from '../../../../../src/plugins/usage_collection/server';
import type { AlertingApiRequestHandlerContext } from '../../../alerting/server';
import type { LicensingApiRequestHandlerContext } from '../../../licensing/server';
import type {
  IRuleDataClient,
  RacApiRequestHandlerContext,
} from '../../../rule_registry/server';
import type { APMPluginDependencies } from '../types';

export interface ApmPluginRequestHandlerContext extends RequestHandlerContext {
  licensing: LicensingApiRequestHandlerContext;
  alerting: AlertingApiRequestHandlerContext;
  rac: RacApiRequestHandlerContext;
}

export interface APMRouteCreateOptions {
  options: {
    tags: Array<
      | 'access:apm'
      | 'access:apm_write'
      | 'access:ml:canGetJobs'
      | 'access:ml:canCreateJob'
    >;
    body?: { accepts: Array<'application/json' | 'multipart/form-data'> };
    disableTelemetry?: boolean;
  };
}

export type TelemetryUsageCounter = ReturnType<
  UsageCollectionSetup['createUsageCounter']
>;

export interface APMRouteHandlerResources {
  request: KibanaRequest;
  context: ApmPluginRequestHandlerContext;
  params: {
    query: {
      _inspect: boolean;
    };
  };
  config: APMConfig;
  logger: Logger;
  core: {
    setup: CoreSetup;
    start: () => Promise<CoreStart>;
  };
  plugins: {
    [key in keyof APMPluginDependencies]: {
      setup: Required<APMPluginDependencies>[key]['setup'];
      start: () => Promise<Required<APMPluginDependencies>[key]['start']>;
    };
  };
  ruleDataClient: IRuleDataClient;
  telemetryUsageCounter?: TelemetryUsageCounter;
}
