/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';

import { KibanaConfigurationAdapter } from '../configuration/kibana_configuration_adapter';
import { ElasticsearchEventsAdapter, Events } from '../events';
import { KibanaBackendFrameworkAdapter } from '../framework/kibana_framework_adapter';
import { ElasticsearchIndexFieldAdapter, IndexFields } from '../index_fields';
import { ElasticsearchSourceStatusAdapter, SourceStatus } from '../source_status';
import { ConfigurationSourcesAdapter, Sources } from '../sources';
import { AppBackendLibs, AppDomainLibs, Configuration } from '../types';

export function compose(server: Server): AppBackendLibs {
  const configuration = new KibanaConfigurationAdapter<Configuration>(server);
  const framework = new KibanaBackendFrameworkAdapter(server);
  const sources = new Sources(new ConfigurationSourcesAdapter(configuration));
  const sourceStatus = new SourceStatus(new ElasticsearchSourceStatusAdapter(framework), sources);

  const domainLibs: AppDomainLibs = {
    events: new Events(new ElasticsearchEventsAdapter(framework)),
    fields: new IndexFields(new ElasticsearchIndexFieldAdapter(framework), sources),
  };

  const libs: AppBackendLibs = {
    configuration,
    framework,
    sourceStatus,
    sources,
    ...domainLibs,
  };

  return libs;
}
