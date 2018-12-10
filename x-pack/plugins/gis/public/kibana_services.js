/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import { SearchSourceProvider } from 'ui/courier';
import { RequestAdapter } from 'ui/inspector/adapters';
import { MapAdapter } from './inspector/adapters/map_adapter';
import { timefilter } from 'ui/timefilter/timefilter';

export const timeService = timefilter;
export let indexPatternService;
export let SearchSource;
export let emsServiceSettings;
export const inspectorAdapters = {
  requests: new RequestAdapter(),
  map: new MapAdapter(),
};

uiModules.get('app/gis').run(($injector) => {
  indexPatternService = $injector.get('indexPatterns');
  const Private = $injector.get('Private');
  SearchSource = Private(SearchSourceProvider);
  emsServiceSettings = $injector.get('serviceSettings');
});
