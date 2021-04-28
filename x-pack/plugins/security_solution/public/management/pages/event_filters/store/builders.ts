/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventFiltersListPageState } from '../state';
import { MANAGEMENT_DEFAULT_PAGE, MANAGEMENT_DEFAULT_PAGE_SIZE } from '../../../common/constants';

export const initialEventFiltersPageState = (): EventFiltersListPageState => ({
  entries: [],
  form: {
    entry: undefined,
    hasNameError: false,
    hasItemsError: false,
    hasOSError: false,
    submissionResourceState: { type: 'UninitialisedResourceState' },
  },
  location: {
    page_index: MANAGEMENT_DEFAULT_PAGE,
    page_size: MANAGEMENT_DEFAULT_PAGE_SIZE,
    filter: '',
  },
});
