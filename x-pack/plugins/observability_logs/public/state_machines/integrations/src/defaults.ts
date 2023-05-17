/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ImmutableCache } from '../../../../common/immutable_cache';
import { DefaultIntegrationsContext } from './types';

export const DEFAULT_DATA_STREAMS_TYPE = 'logs';

export const DEFAULT_CONTEXT: DefaultIntegrationsContext = {
  cache: new ImmutableCache(),
  integrations: null,
  error: null,
  search: {
    sortOrder: 'asc',
    dataStreamType: DEFAULT_DATA_STREAMS_TYPE,
  },
};
