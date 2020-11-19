/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ContentSource, User, Group } from '../../../types';

import { DEFAULT_META } from '../../../../shared/constants';

export const mockGroupsValues = {
  groups: [] as Group[],
  contentSources: [] as ContentSource[],
  users: [] as User[],
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
