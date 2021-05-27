/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from '../../../../../../src/core/server';
import { SetupPlugins } from '../../plugin';

import { KibanaBackendFrameworkAdapter } from '../framework/kibana_framework_adapter';

import { ElasticsearchIndexFieldAdapter, IndexFields } from '../index_fields';

import { ElasticsearchSourceStatusAdapter, SourceStatus } from '../source_status';
import { ConfigurationSourcesAdapter, Sources } from '../sources';
import { AppBackendLibs, AppDomainLibs } from '../types';
import { note, pinnedEvent, timeline } from '../timeline/saved_object';
import { EndpointAppContext } from '../../endpoint/types';

export function compose(
  core: CoreSetup,
  plugins: SetupPlugins,
  endpointContext: EndpointAppContext
): AppBackendLibs {
  const framework = new KibanaBackendFrameworkAdapter();
  const sources = new Sources(new ConfigurationSourcesAdapter());
  const sourceStatus = new SourceStatus(new ElasticsearchSourceStatusAdapter(framework));

  const domainLibs: AppDomainLibs = {
    fields: new IndexFields(new ElasticsearchIndexFieldAdapter()),
  };

  const libs: AppBackendLibs = {
    framework,
    sourceStatus,
    sources,
    ...domainLibs,
    timeline,
    note,
    pinnedEvent,
  };

  return libs;
}
