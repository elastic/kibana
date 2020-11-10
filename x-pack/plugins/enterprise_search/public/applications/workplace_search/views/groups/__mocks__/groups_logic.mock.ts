/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IContentSource, IUser, IGroup } from '../../../types';

import { DEFAULT_META } from '../../../../shared/constants';

export const mockGroupsValues = {
  groups: [] as IGroup[],
  contentSources: [] as IContentSource[],
  users: [] as IUser[],
  groupsDataLoading: true,
  groupListLoading: true,
  newGroupModalOpen: false,
  newGroupName: '',
  hasFiltersSet: false,
  newGroup: null,
  newGroupNameErrors: [],
  filterSourcesDropdownOpen: false,
  filteredSources: [],
  filterUsersDropdownOpen: false,
  filteredUsers: [],
  allGroupUsersLoading: false,
  allGroupUsers: [],
  filterValue: '',
  groupsMeta: DEFAULT_META,
};
