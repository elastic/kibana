/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IGroupValues } from '../group_logic';

import { IGroupDetails, ISourcePriority } from '../../../types';

export const mockGroupValues = {
  group: {} as IGroupDetails,
  dataLoading: true,
  manageUsersModalVisible: false,
  managerModalFormErrors: [],
  sharedSourcesModalVisible: false,
  confirmDeleteModalVisible: false,
  groupNameInputValue: '',
  selectedGroupSources: [],
  selectedGroupUsers: [],
  groupPrioritiesUnchanged: true,
  activeSourcePriorities: {} as ISourcePriority,
  cachedSourcePriorities: {} as ISourcePriority,
} as IGroupValues;
