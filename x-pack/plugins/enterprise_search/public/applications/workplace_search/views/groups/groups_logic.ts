/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { storeLogic } from 'shared/store';

import http from 'shared/http';
import routes from 'workplace_search/routes';

import { IContentSource, IGroup, IUser } from 'workplace_search/types';

import { DEFAULT_META } from 'shared/constants/defaultMeta';
import { IMeta, IFlashMessagesProps } from 'shared/types';

export const MAX_NAME_LENGTH = 40;

interface IGroupsServerData {
  contentSources: IContentSource[];
  users: IUser[];
}

interface IGroupsSearchResponse {
  results: IGroup[];
  meta: IMeta;
}

export interface IGroupsActions {
  setFlashMessages(flashMessages: IFlashMessagesProps);
  onInitializeGroups(data: IGroupsServerData);
  setSearchResults(data: IGroupsSearchResponse);
  addFilteredSource(sourceId: string);
  removeFilteredSource(sourceId: string);
  addFilteredUser(userId: string);
  removeFilteredUser(userId: string);
  setGroupUsers(allGroupUsers: IUser[]);
  setAllGroupLoading(allGroupUsersLoading: boolean);
  setFilterValue(filterValue: string);
  setActivePage(activePage: number);
  setNewGroupName(newGroupName: string);
  setNewGroup(newGroup: IGroup);
  setNewGroupFormErrors(errors: string[]);
  openNewGroupModal();
  closeNewGroupModal();
  closeFilterSourcesDropdown();
  closeFilterUsersDropdown();
  toggleFilterSourcesDropdown();
  toggleFilterUsersDropdown();
  setGroupsLoading();
  resetGroupsFilters();
  resetGroups();
  initializeGroups();
  getSearchResults(resetPagination?: boolean);
  fetchGroupUsers(groupId: string);
  saveNewGroup();
}

export interface IGroupsValues {
  flashMessages?: IFlashMessagesProps;
  groups: IGroup[];
  contentSources: IContentSource[];
  users: IUser[];
  groupsDataLoading: boolean;
  groupListLoading: boolean;
  newGroupModalOpen: boolean;
  newGroupName: string;
  newGroup: IGroup;
  newGroupNameErrors: string[];
  filterSourcesDropdownOpen: boolean;
  filteredSources: string[];
  filterUsersDropdownOpen: boolean;
  filteredUsers: string[];
  allGroupUsersLoading: boolean;
  allGroupUsers: IUser[];
  filterValue: string;
  groupsMeta: IMeta;
  hasFiltersSet: boolean;
}

interface IListenerParams {
  actions: IGroupsActions;
  values: IGroupsValues;
}

export const GroupsLogic = storeLogic({
  actions: (): IGroupsActions => ({
    setFlashMessages: (flashMessages: IFlashMessagesProps) => ({ flashMessages }),
    onInitializeGroups: (data: IGroupsServerData) => data,
    setSearchResults: (data: IGroupsSearchResponse) => data,
    addFilteredSource: (sourceId: string) => sourceId,
    removeFilteredSource: (sourceId: string) => sourceId,
    addFilteredUser: (userId: string) => userId,
    removeFilteredUser: (userId: string) => userId,
    setGroupUsers: (allGroupUsers: IUser[]) => allGroupUsers,
    setAllGroupLoading: (allGroupUsersLoading: boolean) => allGroupUsersLoading,
    setFilterValue: (filterValue: string) => filterValue,
    setActivePage: (activePage: number) => activePage,
    setNewGroupName: (newGroupName: string) => newGroupName,
    setNewGroup: (newGroup: IGroup) => newGroup,
    setNewGroupFormErrors: (errors: string[]) => errors,
    openNewGroupModal: () => true,
    closeNewGroupModal: () => true,
    closeFilterSourcesDropdown: () => true,
    closeFilterUsersDropdown: () => true,
    toggleFilterSourcesDropdown: () => true,
    toggleFilterUsersDropdown: () => true,
    setGroupsLoading: () => true,
    resetGroupsFilters: () => true,
    resetGroups: () => true,
    initializeGroups: () => true,
    getSearchResults: (resetPagination?: boolean) => ({ resetPagination }),
    fetchGroupUsers: (groupId: string) => ({ groupId }),
    saveNewGroup: () => true,
  }),
  reducers: () => ({
    flashMessages: [
      {},
      {
        setFlashMessages: (_, { flashMessages }) => flashMessages,
        setNewGroup: (_, group) => ({ success: [`Successfully created "${group.name}".`] }),
        setGroupsLoading: () => ({}),
      },
    ],
    groups: [
      [],
      {
        setSearchResults: (_, { results }) => results,
      },
    ],
    contentSources: [
      [],
      {
        onInitializeGroups: (_, { contentSources }) => contentSources,
      },
    ],
    users: [
      [],
      {
        onInitializeGroups: (_, { users }) => users,
      },
    ],
    groupsDataLoading: [
      true,
      {
        onInitializeGroups: () => false,
      },
    ],
    groupListLoading: [
      true,
      {
        setSearchResults: () => false,
        setGroupsLoading: () => true,
      },
    ],
    newGroupModalOpen: [
      false,
      {
        openNewGroupModal: () => true,
        closeNewGroupModal: () => false,
        setNewGroup: () => false,
      },
    ],
    newGroupName: [
      '',
      {
        setNewGroupName: (_, newGroupName) => newGroupName,
        setSearchResults: () => '',
        closeNewGroupModal: () => '',
      },
    ],
    newGroup: [
      null,
      {
        setNewGroup: (_, newGroup) => newGroup,
        resetGroups: () => null,
        openNewGroupModal: () => null,
      },
    ],
    newGroupNameErrors: [
      [],
      {
        setNewGroupFormErrors: (_, newGroupNameErrors) => newGroupNameErrors,
        setNewGroup: () => [],
        setNewGroupName: () => [],
        closeNewGroupModal: () => [],
      },
    ],
    filterSourcesDropdownOpen: [
      false,
      {
        toggleFilterSourcesDropdown: (state) => !state,
        closeFilterSourcesDropdown: () => false,
      },
    ],
    filteredSources: [
      [],
      {
        resetGroupsFilters: () => [],
        setNewGroup: () => [],
        addFilteredSource: (state, sourceId) => [...state, sourceId].sort(),
        removeFilteredSource: (state, sourceId) => state.filter((id) => id !== sourceId),
      },
    ],
    filterUsersDropdownOpen: [
      false,
      {
        toggleFilterUsersDropdown: (state) => !state,
        closeFilterUsersDropdown: () => false,
      },
    ],
    filteredUsers: [
      [],
      {
        resetGroupsFilters: () => [],
        setNewGroup: () => [],
        addFilteredUser: (state, userId) => [...state, userId].sort(),
        removeFilteredUser: (state, userId) => state.filter((id) => id !== userId),
      },
    ],
    allGroupUsersLoading: [
      false,
      {
        setAllGroupLoading: (_, allGroupUsersLoading) => allGroupUsersLoading,
        setGroupUsers: () => false,
      },
    ],
    allGroupUsers: [
      [],
      {
        setGroupUsers: (_, allGroupUsers) => allGroupUsers,
        setAllGroupLoading: () => [],
      },
    ],
    filterValue: [
      '',
      {
        setFilterValue: (_, filterValue) => filterValue,
        resetGroupsFilters: () => '',
      },
    ],
    groupsMeta: [
      DEFAULT_META,
      {
        resetGroupsFilters: () => DEFAULT_META,
        setNewGroup: () => DEFAULT_META,
        setSearchResults: (_, { meta }) => meta,
        setActivePage: (state, activePage) => ({
          ...state,
          page: {
            ...state.page,
            current: activePage,
          },
        }),
      },
    ],
  }),
  selectors: ({ selectors }) => ({
    hasFiltersSet: [
      () => [selectors.filteredUsers, selectors.filteredSources],
      (filteredUsers, filteredSources) => filteredUsers.length > 0 || filteredSources.length > 0,
    ],
  }),
  listeners: ({ actions, values }: IListenerParams) => ({
    initializeGroups: () => {
      const route = routes.fritoPieOrganizationGroupsPath();
      http(route)
        .then(({ data }) => actions.onInitializeGroups(data))
        .catch(({ response }) => actions.setFlashMessages({ error: response.data.errors }));
    },
    getSearchResults: ({ resetPagination }) => {
      actions.setGroupsLoading();
      const route = routes.searchFritoPieOrganizationGroupsPath();
      const {
        groupsMeta: {
          page: { current, size },
        },
        filterValue,
        filteredSources,
        filteredUsers,
      } = values;

      // Is the user changes the query while on a different page, we want to start back over at 1.
      const page = {
        current: resetPagination ? 1 : current,
        size,
      };
      const search = {
        query: filterValue,
        content_source_ids: filteredSources,
        user_ids: filteredUsers,
      };

      http
        .post(route, { page, search })
        .then(({ data }) => actions.setSearchResults(data))
        .catch(({ response }) => actions.setFlashMessages({ error: response.data.errors }));
    },
    fetchGroupUsers: ({ groupId }) => {
      actions.setAllGroupLoading(true);
      const route = routes.groupUsersFritoPieOrganizationGroupPath(groupId);
      http(route)
        .then(({ data }) => actions.setGroupUsers(data))
        .catch(({ response }) => actions.setFlashMessages({ error: response.data.errors }));
    },
    saveNewGroup: () => {
      const route = routes.fritoPieOrganizationGroupsPath();
      http
        .post(route, { group_name: values.newGroupName })
        .then(({ data }) => {
          actions.getSearchResults(true);
          actions.setNewGroup(data);
        })
        .catch(({ response }) => actions.setNewGroupFormErrors(response.data.errors));
    },
  }),
});
