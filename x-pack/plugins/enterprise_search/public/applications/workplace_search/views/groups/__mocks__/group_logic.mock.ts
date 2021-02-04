/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GroupDetails, SourcePriority } from '../../../types';

export const mockGroupValues = {
  group: {} as GroupDetails,
  dataLoading: true,
  manageUsersModalVisible: false,
  managerModalFormErrors: [],
  sharedSourcesModalVisible: false,
  confirmDeleteModalVisible: false,
  groupNameInputValue: '',
  selectedGroupSources: [],
  selectedGroupUsers: [],
  groupPrioritiesUnchanged: true,
  activeSourcePriorities: {} as SourcePriority,
  cachedSourcePriorities: {} as SourcePriority,
};
