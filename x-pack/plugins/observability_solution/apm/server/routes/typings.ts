/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CustomRequestHandlerContext,
  CoreStart,
  IScopedClusterClient,
  IUiSettingsClient,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { RacApiRequestHandlerContext } from '@kbn/rule-registry-plugin/server';
import type { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { RulesClientApi } from '@kbn/alerting-plugin/server/types';

export type ApmPluginRequestHandlerContext = CustomRequestHandlerContext<{
  licensing: Pick<LicensingApiRequestHandlerContext, 'license' | 'featureUsage'>;
  alerting: {
    getRulesClient: () => Promise<RulesClientApi>;
  };
  rac: Pick<RacApiRequestHandlerContext, 'getAlertsClient'>;
}>;

// what is available in system connectors
export type MinimalApmPluginRequestHandlerContext = Omit<
  ApmPluginRequestHandlerContext,
  'core' | 'resolve'
> & {
  core: Promise<{
    elasticsearch: {
      client: IScopedClusterClient;
    };
    uiSettings: {
      client: IUiSettingsClient;
    };
    savedObjects: {
      client: SavedObjectsClientContract;
    };
  }>;
};

export interface APMRouteCreateOptions {
  tags: Array<
    | 'access:apm'
    | 'access:apm_write'
    | 'access:apm_settings_write'
    | 'access:ml:canGetJobs'
    | 'access:ml:canCreateJob'
    | 'access:ml:canCloseJob'
    | 'access:ai_assistant'
    | 'oas-tag:APM agent keys'
    | 'oas-tag:APM annotations'
  >;
  disableTelemetry?: boolean;
}

export type TelemetryUsageCounter = ReturnType<UsageCollectionSetup['createUsageCounter']>;

export interface APMCore {
  setup: CoreSetup;
  start: () => Promise<CoreStart>;
}
