/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';

import { KibanaConfigurationAdapter } from '../configuration/kibana_configuration_adapter';
import { ElasticsearchEventsAdapter, Events } from '../events';
import { KibanaBackendFrameworkAdapter } from '../framework/kibana_framework_adapter';
import { Sources } from '../sources';
import { ConfigurationSourcesAdapter } from '../sources/configuration_sources_adapter';
import { AppBackendLibs, AppDomainLibs, Configuration } from '../types';

export function compose(server: Server): AppBackendLibs {
  const configuration = new KibanaConfigurationAdapter<Configuration>(server);
  const framework = new KibanaBackendFrameworkAdapter(server);
  const sources = new Sources(new ConfigurationSourcesAdapter(configuration));

  const domainLibs: AppDomainLibs = {
    events: new Events(new ElasticsearchEventsAdapter(framework)),
  };

  const libs: AppBackendLibs = {
    configuration,
    framework,
    sources,
    ...domainLibs,
  };

  return libs;
}
