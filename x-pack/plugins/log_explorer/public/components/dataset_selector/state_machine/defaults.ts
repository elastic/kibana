/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AllDatasetSelection } from '../../../../common/dataset_selection';
import { HashedCache } from '../../../../common/hashed_cache';
import { INTEGRATIONS_PANEL_ID, INTEGRATIONS_TAB_ID } from '../constants';
import { DatasetsSelectorSearchParams } from '../types';
import { DefaultDatasetsSelectorContext } from './types';

export const defaultSearch: DatasetsSelectorSearchParams = {
  name: '',
  sortOrder: 'asc',
};

export const DEFAULT_CONTEXT: DefaultDatasetsSelectorContext = {
  selection: AllDatasetSelection.create(),
  searchCache: new HashedCache(),
  panelId: INTEGRATIONS_PANEL_ID,
  tabId: INTEGRATIONS_TAB_ID,
  search: defaultSearch,
};
