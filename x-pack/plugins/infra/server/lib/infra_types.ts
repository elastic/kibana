/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraConfigurationAdapter } from './adapters/configuration';
import { InfraBackendFrameworkAdapter, InfraFrameworkRequest } from './adapters/framework';
import { InfraCapabilitiesDomain } from './domains/capabilities_domain';
import { InfraFieldsDomain } from './domains/fields_domain';
import { InfraLogEntriesDomain } from './domains/log_entries_domain';
import { InfraMetricsDomain } from './domains/metrics_domain';
import { InfraNodesDomain } from './domains/nodes_domain';
import { InfraSourceStatus } from './source_status';
import { InfraSourceConfigurations, InfraSources } from './sources';

export interface InfraDomainLibs {
  capabilities: InfraCapabilitiesDomain;
  fields: InfraFieldsDomain;
  logEntries: InfraLogEntriesDomain;
  nodes: InfraNodesDomain;
  metrics: InfraMetricsDomain;
}

export interface InfraBackendLibs extends InfraDomainLibs {
  configuration: InfraConfigurationAdapter<InfraConfiguration>;
  framework: InfraBackendFrameworkAdapter;
  sources: InfraSources;
  sourceStatus: InfraSourceStatus;
}

export interface InfraConfiguration {
  enabled: boolean;
  query: {
    partitionSize: number;
    partitionFactor: number;
  };
  sources: InfraSourceConfigurations;
}

export interface InfraContext {
  req: InfraFrameworkRequest;
}
