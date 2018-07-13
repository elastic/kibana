/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraConfigurationAdapter } from './adapters/configuration';
import { InfraBackendFrameworkAdapter, InfraFrameworkRequest } from './adapters/framework';
import { InfraFieldsDomain } from './domains/fields_domain';
import { InfraNodesDomain } from './domains/nodes_domain';

export interface InfraDomainLibs {
  fields: InfraFieldsDomain;
  nodes: InfraNodesDomain;
}

export interface InfraBackendLibs extends InfraDomainLibs {
  framework: InfraBackendFrameworkAdapter;
  configuration: InfraConfigurationAdapter<InfraConfiguration>;
}

export interface InfraSourceConfiguration {
  metricAlias: string;
  logAlias: string;
  fields: {
    container: string;
    hostname: string;
    message: string[];
    pod: string;
    tiebreaker: string;
    timestamp: string;
  };
}

export interface InfraConfiguration {
  enabled: boolean;
  query: {
    partitionSize: number;
    partitionFactor: number;
  };
  sources: {
    default: InfraSourceConfiguration;
    [sourceName: string]: InfraSourceConfiguration;
  };
}

export interface InfraContext {
  req: InfraFrameworkRequest;
  libs: InfraBackendLibs;
}
