/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { handleEsError } from '../../../../../src/plugins/es_ui_shared/server';
import type { InfraConfig } from '../plugin';
import type { GetLogQueryFields } from '../services/log_queries/get_log_query_fields';
import type { RulesServiceSetup } from '../services/rules/types';
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
  configuration: InfraConfig;
  framework: KibanaFramework;
  sources: InfraSources;
  sourceStatus: InfraSourceStatus;
  getLogQueryFields: GetLogQueryFields;
  handleEsError: typeof handleEsError;
  logsRules: RulesServiceSetup;
  metricsRules: RulesServiceSetup;
}
