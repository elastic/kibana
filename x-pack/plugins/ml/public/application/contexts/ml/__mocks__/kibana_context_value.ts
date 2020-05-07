/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { indexPatternMock } from './index_pattern';
import { indexPatternsMock } from './index_patterns';
import { kibanaConfigMock } from './kibana_config';
import { savedSearchMock } from './saved_search';

export const kibanaContextValueMock = {
  combinedQuery: {
    query: 'the-query-string',
    language: 'the-query-language',
  },
  currentIndexPattern: indexPatternMock,
  currentSavedSearch: savedSearchMock,
  indexPatterns: indexPatternsMock,
  kibanaConfig: kibanaConfigMock,
};
