/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ImmutableCache } from '../../../../common/immutable_cache';
import { INTEGRATION_PANEL_ID } from '../constants';
import { DataStreamsSelectorSearchParams, DefaultDataStreamsSelectorContext } from './types';

export const defaultSearch: DataStreamsSelectorSearchParams = {
  name: '',
  sortOrder: 'asc',
};

export const DEFAULT_CONTEXT: DefaultDataStreamsSelectorContext = {
  searchCache: new ImmutableCache(),
  panelId: INTEGRATION_PANEL_ID,
  search: defaultSearch,
};
