/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { IBasePath } from '@kbn/core/server';
import type { handleEsError } from '@kbn/es-ui-shared-plugin/server';
import type { AlertsLocatorParams } from '@kbn/observability-plugin/common';
import type { ObservabilityConfig } from '@kbn/observability-plugin/server';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { RulesServiceSetup } from '../services/rules';
import type { InfraConfig, InfraPluginStartServicesAccessor } from '../types';
import type { KibanaFramework } from './adapters/framework/kibana_framework_adapter';
import type { InfraFieldsDomain } from './domains/fields_domain';
import type { InfraLogEntriesDomain } from './domains/log_entries_domain';
import type { InfraMetricsDomain } from './domains/metrics_domain';
import type { InfraSources } from './sources';
import type { InfraSourceStatus } from './source_status';

export interface InfraDomainLibs {
  fields: InfraFieldsDomain;
  logEntries: InfraLogEntriesDomain;
  metrics: InfraMetricsDomain;
}

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
  alertsLocator?: LocatorPublic<AlertsLocatorParams>;
}
