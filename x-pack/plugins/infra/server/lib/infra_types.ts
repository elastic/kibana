/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InfraSources } from '@kbn/metrics-data-plugin/server/lib/sources';
import type { Logger } from '@kbn/logging';
import type { IBasePath } from '@kbn/core/server';
import type { handleEsError } from '@kbn/es-ui-shared-plugin/server';
import type { AlertsLocatorParams } from '@kbn/observability-plugin/common';
import { ObservabilityConfig } from '@kbn/observability-plugin/server';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { ILogsSharedLogEntriesDomain } from '@kbn/logs-shared-plugin/server';
import { RulesServiceSetup } from '../services/rules';
import { InfraConfig, InfraPluginStartServicesAccessor } from '../types';
import { KibanaFramework } from './adapters/framework/kibana_framework_adapter';
import { InfraMetricsDomain } from './domains/metrics_domain';

export interface InfraDomainLibs {
  logEntries: ILogsSharedLogEntriesDomain;
  metrics: InfraMetricsDomain;
}

export interface InfraBackendLibs extends InfraDomainLibs {
  basePath: IBasePath;
  configuration: InfraConfig;
  framework: KibanaFramework;
  logsRules: RulesServiceSetup;
  metricsRules: RulesServiceSetup;
  sources: InfraSources;
  getAlertDetailsConfig: () => ObservabilityConfig['unsafe']['alertDetails'];
  getStartServices: InfraPluginStartServicesAccessor;
  handleEsError: typeof handleEsError;
  logger: Logger;
  alertsLocator?: LocatorPublic<AlertsLocatorParams>;
}
