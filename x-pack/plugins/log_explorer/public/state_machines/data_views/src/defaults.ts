/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HashedCache } from '../../../../common/hashed_cache';
import { DefaultDataViewsContext } from './types';

export const DEFAULT_CONTEXT: DefaultDataViewsContext = {
  cache: new HashedCache(),
  dataViewsSource: null,
  dataViews: null,
  error: null,
  search: {
    name: '',
    sortOrder: 'asc',
  },
};
