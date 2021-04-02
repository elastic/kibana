/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InfraSourceConfiguration } from '../../common/source_configuration/source_configuration';
import { InfraFieldsDomain } from './domains/fields_domain';
import { InfraLogEntriesDomain } from './domains/log_entries_domain';
import { InfraMetricsDomain } from './domains/metrics_domain';
import { InfraSources } from './sources';
import { InfraSourceStatus } from './source_status';
import { InfraConfig } from '../plugin';
import { KibanaFramework } from './adapters/framework/kibana_framework_adapter';
import { GetLogQueryFields } from '../services/log_queries/get_log_query_fields';

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
}

export interface InfraConfiguration {
  enabled: boolean;
  query: {
    partitionSize: number;
    partitionFactor: number;
  };
  sources: {
    default: InfraSourceConfiguration;
  };
}
