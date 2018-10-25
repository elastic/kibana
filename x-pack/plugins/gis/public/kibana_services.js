/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import { SearchSourceProvider } from 'ui/courier';
import { MappedRequestAdapter } from 'ui/inspector/adapters';
import { timefilter } from 'ui/timefilter/timefilter';

export const timeService = timefilter;
export let indexPatternService;
export let SearchSource;
export const inspectorAdapters = {
  requests: new MappedRequestAdapter()
};

uiModules.get('app/gis').run(($injector) => {
  indexPatternService = $injector.get('indexPatterns');
  const Private = $injector.get('Private');
  SearchSource = Private(SearchSourceProvider);
});
