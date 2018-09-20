/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import { SearchSourceProvider } from 'ui/courier';

export let indexPatternService;
export let SearchSource;

uiModules.get('gis').run(($injector) => {
  indexPatternService = $injector.get('indexPatterns');
  const Private = $injector.get('Private');
  SearchSource = Private(SearchSourceProvider);
});
