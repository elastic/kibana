/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import type { IBasePath } from '@kbn/core/server';
import { handleEsError } from '@kbn/es-ui-shared-plugin/server';
import { ObservabilityConfig } from '@kbn/observability-plugin/server';
import { RulesServiceSetup } from '../services/rules';
import { InfraConfig, InfraPluginStartServicesAccessor } from '../types';
import { KibanaFramework } from './adapters/framework/kibana_framework_adapter';
import { InfraFieldsDomain } from './domains/fields_domain';
import { InfraLogEntriesDomain } from './domains/log_entries_domain';
import { InfraMetricsDomain } from './domains/metrics_domain';
import { InfraSources } from './sources';
import { InfraSourceStatus } from './source_status';

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
}
