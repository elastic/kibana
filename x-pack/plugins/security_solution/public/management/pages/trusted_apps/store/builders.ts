/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConditionEntryField, OperatingSystem } from '@kbn/securitysolution-utils';
import { TrustedAppConditionEntry, NewTrustedApp } from '../../../../../common/endpoint/types';

import { MANAGEMENT_DEFAULT_PAGE, MANAGEMENT_DEFAULT_PAGE_SIZE } from '../../../common/constants';

import { TrustedAppsListPageState } from '../state';

export const defaultConditionEntry = (): TrustedAppConditionEntry<ConditionEntryField.HASH> => ({
  field: ConditionEntryField.HASH,
  operator: 'included',
  type: 'match',
  value: '',
});

export const defaultNewTrustedApp = (): NewTrustedApp => ({
  name: '',
  os: OperatingSystem.WINDOWS,
  entries: [defaultConditionEntry()],
  description: '',
  effectScope: { type: 'global' },
});

export const initialDeletionDialogState = (): TrustedAppsListPageState['deletionDialog'] => ({
  confirmed: false,
  submissionResourceState: { type: 'UninitialisedResourceState' },
});

export const initialCreationDialogState = (): TrustedAppsListPageState['creationDialog'] => ({
  confirmed: false,
  submissionResourceState: { type: 'UninitialisedResourceState' },
});

export const initialTrustedAppsPageState = (): TrustedAppsListPageState => ({
  entriesExist: { type: 'UninitialisedResourceState' },
  listView: {
    listResourceState: { type: 'UninitialisedResourceState' },
    freshDataTimestamp: Date.now(),
  },
  deletionDialog: initialDeletionDialogState(),
  creationDialog: initialCreationDialogState(),
  policies: { type: 'UninitialisedResourceState' },
  location: {
    page_index: MANAGEMENT_DEFAULT_PAGE,
    page_size: MANAGEMENT_DEFAULT_PAGE_SIZE,
    show: undefined,
    id: undefined,
    view_type: 'grid',
    filter: '',
    included_policies: '',
  },
  active: false,
  forceRefresh: false,
});
