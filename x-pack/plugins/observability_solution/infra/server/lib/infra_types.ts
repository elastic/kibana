/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { IBasePath } from '@kbn/core/server';
import type { handleEsError } from '@kbn/es-ui-shared-plugin/server';
import { ObservabilityConfig } from '@kbn/observability-plugin/server';
import type { ILogsSharedLogEntriesDomain } from '@kbn/logs-shared-plugin/server';
import type {
  AssetDetailsLocator,
  InventoryLocator,
  MetricsExplorerLocator,
} from '@kbn/observability-shared-plugin/common';
import type { AlertsLocator } from '@kbn/observability-plugin/common';
import { RulesServiceSetup } from '../services/rules';
import { InfraConfig, InfraPluginStartServicesAccessor } from '../types';
import { KibanaFramework } from './adapters/framework/kibana_framework_adapter';
import { InfraMetricsDomain } from './domains/metrics_domain';
import { InfraSources } from './sources';
import { InfraSourceStatus } from './source_status';
import type { InfraServerPluginSetupDeps, InfraServerPluginStartDeps } from './adapters/framework';

export interface InfraDomainLibs {
  logEntries: ILogsSharedLogEntriesDomain;
  metrics: InfraMetricsDomain;
}

type Plugins = {
  [key in keyof InfraServerPluginSetupDeps]: {
    setup: Required<InfraServerPluginSetupDeps>[key];
  } & (key extends keyof InfraServerPluginStartDeps
    ? {
        start: () => Promise<Required<InfraServerPluginStartDeps>[key]>;
      }
    : {});
};
export interface InfraBackendLibs extends InfraDomainLibs {
  basePath: IBasePath;
  configuration: InfraConfig;
  framework: KibanaFramework;
  logsRules: RulesServiceSetup;
  metricsRules: RulesServiceSetup;
  sources: InfraSources;
  sourceStatus: InfraSourceStatus;
  getAlertDetailsConfig: () => ObservabilityConfig['unsafe']['alertDetails'];
  getStartServices: InfraPluginStartServicesAccessor;
  handleEsError: typeof handleEsError;
  logger: Logger;
  plugins: Plugins;
}

export interface InfraLocators {
  alertsLocator?: AlertsLocator;
  assetDetailsLocator: AssetDetailsLocator;
  metricsExplorerLocator: MetricsExplorerLocator;
  inventoryLocator: InventoryLocator;
}
