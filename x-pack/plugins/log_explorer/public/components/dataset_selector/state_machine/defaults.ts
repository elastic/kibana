/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AllDatasetSelection } from '../../../utils/dataset_selection';
import { HashedCache } from '../../../../common/hashed_cache';
import { INTEGRATION_PANEL_ID } from '../constants';
import { DatasetsSelectorSearchParams } from '../types';
import { DefaultDatasetsSelectorContext } from './types';

export const defaultSearch: DatasetsSelectorSearchParams = {
  name: '',
  sortOrder: 'asc',
};

export const DEFAULT_CONTEXT: DefaultDatasetsSelectorContext = {
  selection: AllDatasetSelection.create(),
  searchCache: new HashedCache(),
  panelId: INTEGRATION_PANEL_ID,
  search: defaultSearch,
};
