/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HashedCache } from '../../../../common/hashed_cache';
import { DefaultDatasetsContext } from './types';

export const createDefaultContext = (): DefaultDatasetsContext => ({
  cache: new HashedCache(),
  datasets: null,
  error: null,
  search: {
    datasetQuery: '',
    sortOrder: 'asc',
  },
});
