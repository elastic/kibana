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
    newComment: '',
    submissionResourceState: { type: 'UninitialisedResourceState' },
  },
  location: {
    page_index: MANAGEMENT_DEFAULT_PAGE,
    page_size: MANAGEMENT_DEFAULT_PAGE_SIZE,
    filter: '',
  },
  listPage: {
    active: false,
    forceRefresh: false,
    data: { type: 'UninitialisedResourceState' },
    /** We started off assuming data exists, until we can confirm othewise */
    dataExist: { type: 'LoadedResourceState', data: true },
  },
});
