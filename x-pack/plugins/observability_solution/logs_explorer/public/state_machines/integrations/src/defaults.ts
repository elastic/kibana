/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HashedCache } from '../../../../common/hashed_cache';
import { DefaultIntegrationsContext } from './types';

export const createDefaultContext = (): DefaultIntegrationsContext => ({
  cache: new HashedCache(),
  integrationsSource: null,
  integrations: null,
  error: null,
  search: {
    nameQuery: '',
    sortOrder: 'asc',
  },
});
