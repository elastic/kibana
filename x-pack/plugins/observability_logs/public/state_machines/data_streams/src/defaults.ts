/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ImmutableCache } from '../../../../common/immutable_cache';
import { DefaultDataStreamsContext } from './types';

export const DEFAULT_CONTEXT: DefaultDataStreamsContext = {
  cache: new ImmutableCache(),
  dataStreams: null,
  error: null,
  search: {
    datasetQuery: '',
    sortOrder: 'asc',
  },
};
