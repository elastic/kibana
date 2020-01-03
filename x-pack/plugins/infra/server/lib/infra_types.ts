/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraSourceConfiguration } from '../../common/graphql/types';
import { InfraFieldsDomain } from './domains/fields_domain';
import { InfraLogEntriesDomain } from './domains/log_entries_domain';
import { InfraMetricsDomain } from './domains/metrics_domain';
import { InfraLogAnalysis } from './log_analysis/log_analysis';
import { InfraSnapshot } from './snapshot';
import { InfraSources } from './sources';
import { InfraSourceStatus } from './source_status';
import { InfraConfig } from '../plugin';
import { KibanaFramework } from './adapters/framework/kibana_framework_adapter';

// NP_TODO: We shouldn't need this context anymore but I am
// not sure how the graphql stuff uses it, so we can't remove it yet
export interface InfraContext {
  req: any;
  rawReq?: any;
}

export interface InfraDomainLibs {
  fields: InfraFieldsDomain;
  logEntries: InfraLogEntriesDomain;
  metrics: InfraMetricsDomain;
}

export interface InfraBackendLibs extends InfraDomainLibs {
  configuration: InfraConfig;
  framework: KibanaFramework;
  logAnalysis: InfraLogAnalysis;
  snapshot: InfraSnapshot;
  sources: InfraSources;
  sourceStatus: InfraSourceStatus;
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
