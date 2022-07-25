/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_META } from '../../../../shared/constants';
import { ContentSource, Group } from '../../../types';

export const mockGroupsValues = {
  groups: [] as Group[],
  contentSources: [] as ContentSource[],
  groupsDataLoading: true,
  groupListLoading: true,
  newGroupModalOpen: false,
  newGroupName: '',
  hasFiltersSet: false,
  newGroup: null,
  newGroupNameErrors: [],
  filterSourcesDropdownOpen: false,
  filteredSources: [],
  filterValue: '',
  groupsMeta: DEFAULT_META,
};
