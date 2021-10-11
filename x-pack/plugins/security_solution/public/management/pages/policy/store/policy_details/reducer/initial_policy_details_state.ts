/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Immutable } from '../../../../../../../common/endpoint/types';
import { PolicyDetailsState } from '../../../types';
import {
  MANAGEMENT_DEFAULT_PAGE,
  MANAGEMENT_DEFAULT_PAGE_SIZE,
} from '../../../../../common/constants';
import { createUninitialisedResourceState } from '../../../../../state';

/**
 * Return a fresh copy of initial state, since we mutate state in the reducer.
 */
export const initialPolicyDetailsState: () => Immutable<PolicyDetailsState> = () => ({
  policyItem: undefined,
  isLoading: false,
  agentStatusSummary: {
    error: 0,
    events: 0,
    offline: 0,
    online: 0,
    total: 0,
    other: 0,
  },
  artifacts: {
    location: {
      page_index: MANAGEMENT_DEFAULT_PAGE,
      page_size: MANAGEMENT_DEFAULT_PAGE_SIZE,
      show: undefined,
      filter: '',
    },
    assignableList: createUninitialisedResourceState(),
    trustedAppsToUpdate: createUninitialisedResourceState(),
    assignableListEntriesExist: createUninitialisedResourceState(),
    doesAnyTrustedAppExists: createUninitialisedResourceState(),
    assignedList: createUninitialisedResourceState(),
    policies: createUninitialisedResourceState(),
    removeList: createUninitialisedResourceState(),
  },
});
