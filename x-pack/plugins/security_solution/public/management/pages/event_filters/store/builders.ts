/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MANAGEMENT_DEFAULT_PAGE, MANAGEMENT_DEFAULT_PAGE_SIZE } from '../../../common/constants';
import { EventFiltersListPageState } from '../types';
import { createLoadedResourceState, createUninitialisedResourceState } from '../../../state';

export const initialEventFiltersPageState = (): EventFiltersListPageState => ({
  entries: [],
  form: {
    entry: undefined,
    hasNameError: false,
    hasItemsError: false,
    hasOSError: false,
    newComment: '',
    submissionResourceState: createUninitialisedResourceState(),
  },
  location: {
    page_index: MANAGEMENT_DEFAULT_PAGE,
    page_size: MANAGEMENT_DEFAULT_PAGE_SIZE,
    filter: '',
  },
  listPage: {
    active: false,
    forceRefresh: false,
    data: createUninitialisedResourceState(),
    /** We started off assuming data exists, until we can confirm otherwise */
    dataExist: createLoadedResourceState(true),
    deletion: {
      item: undefined,
      status: createUninitialisedResourceState(),
    },
  },
});
