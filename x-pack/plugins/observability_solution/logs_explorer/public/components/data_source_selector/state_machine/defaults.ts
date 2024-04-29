/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AllDatasetSelection } from '../../../../common/data_source_selection';
import { HashedCache } from '../../../../common/hashed_cache';
import { INTEGRATIONS_PANEL_ID, INTEGRATIONS_TAB_ID } from '../constants';
import { DataSourceSelectorSearchParams } from '../types';
import { DefaultDataSourceSelectorContext } from './types';

export const defaultSearch: DataSourceSelectorSearchParams = {
  name: '',
  sortOrder: 'asc',
};

export const DEFAULT_CONTEXT: DefaultDataSourceSelectorContext = {
  selection: AllDatasetSelection.create(),
  searchCache: new HashedCache(),
  panelId: INTEGRATIONS_PANEL_ID,
  tabId: INTEGRATIONS_TAB_ID,
  search: defaultSearch,
  dataViewsFilter: {},
};
