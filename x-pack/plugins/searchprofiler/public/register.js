/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DevToolsRegistryProvider } from 'ui/registry/dev_tools';

DevToolsRegistryProvider.register(() => ({
  order: 5,
  name: 'searchprofiler',
  display: 'Search Profiler',
  url: '#/dev_tools/searchprofiler'
}));
