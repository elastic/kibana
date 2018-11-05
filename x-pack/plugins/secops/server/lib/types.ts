/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ConfigurationAdapter } from './configuration';
import { FrameworkAdapter, FrameworkRequest } from './framework';
import { SourceConfigurations, Sources } from './sources';
import { Suricata } from './suricata';

export interface AppDomainLibs {
  suricata: Suricata;
}

export interface AppBackendLibs extends AppDomainLibs {
  configuration: ConfigurationAdapter<Configuration>;
  framework: FrameworkAdapter;
  sources: Sources;
}

export interface Configuration {
  enabled: boolean;
  query: {
    partitionSize: number;
    partitionFactor: number;
  };
  sources: SourceConfigurations;
}

export interface Context {
  req: FrameworkRequest;
}
