/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kea, MakeLogicType } from 'kea';
import { i18n } from '@kbn/i18n';

import { HttpLogic } from '../../../shared/http';

import {
  FlashMessagesLogic,
  flashAPIErrors,
  setSuccessMessage,
} from '../../../shared/flash_messages';

import { IContentSource, IGroup, IUser } from '../../types';

import { JSON_HEADER as headers } from '../../../../../common/constants';
import { DEFAULT_META } from '../../../shared/constants';
import { Meta } from '../../../../../common/types';

export const MAX_NAME_LENGTH = 40;

interface GroupsServerData {
  contentSources: IContentSource[];
  users: IUser[];
}

interface GroupsSearchResponse {
  results: IGroup[];
  meta: Meta;
}

interface GroupsActions {
  onInitializeGroups(data: GroupsServerData): GroupsServerData;
  setSearchResults(data: GroupsSearchResponse): GroupsSearchResponse;
  addFilteredSource(sourceId: string): string;
  removeFilteredSource(sourceId: string): string;
  addFilteredUser(userId: string): string;
  removeFilteredUser(userId: string): string;
  setGroupUsers(allGroupUsers: IUser[]): IUser[];
  setAllGroupLoading(allGroupUsersLoading: boolean): boolean;
  setFilterValue(filterValue: string): string;
  setActivePage(activePage: number): number;
  setNewGroupName(newGroupName: string): string;
  setNewGroup(newGroup: IGroup): IGroup;
  setNewGroupFormErrors(errors: string[]): string[];
  openNewGroupModal(): void;
  closeNewGroupModal(): void;
  closeFilterSourcesDropdown(): void;
  closeFilterUsersDropdown(): void;
  toggleFilterSourcesDropdown(): void;
  toggleFilterUsersDropdown(): void;
  setGroupsLoading(): void;
  resetGroupsFilters(): void;
  resetGroups(): void;
  initializeGroups(): void;
  getSearchResults(resetPagination?: boolean): { resetPagination: boolean | undefined };
  fetchGroupUsers(groupId: string): { groupId: string };
  saveNewGroup(): void;
}

interface GroupsValues {
  groups: IGroup[];
  contentSources: IContentSource[];
  users: IUser[];
  groupsDataLoading: boolean;
  groupListLoading: boolean;
  newGroupModalOpen: boolean;
  newGroupName: string;
  newGroup: IGroup | null;
  newGroupNameErrors: string[];
  filterSourcesDropdownOpen: boolean;
  filteredSources: string[];
  filterUsersDropdownOpen: boolean;
  filteredUsers: string[];
  allGroupUsersLoading: boolean;
  allGroupUsers: IUser[];
  filterValue: string;
  groupsMeta: Meta;
  hasFiltersSet: boolean;
}

export const GroupsLogic = kea<MakeLogicType<GroupsValues, GroupsActions>>({
  path: ['enterprise_search', 'workplace_search', 'groups'],
  actions: {
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
  },
  reducers: {
    groups: [
      [] as IGroup[],
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
  },
  selectors: ({ selectors }) => ({
    hasFiltersSet: [
      () => [selectors.filteredUsers, selectors.filteredSources],
      (filteredUsers, filteredSources) => filteredUsers.length > 0 || filteredSources.length > 0,
    ],
  }),
  listeners: ({ actions, values }) => ({
    initializeGroups: async () => {
      try {
        const response = await HttpLogic.values.http.get('/api/workplace_search/groups');
        actions.onInitializeGroups(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    getSearchResults: async ({ resetPagination }, breakpoint) => {
      // Debounce search results when typing
      await breakpoint(300);

      actions.setGroupsLoading();

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

      try {
        const response = await HttpLogic.values.http.post('/api/workplace_search/groups/search', {
          body: JSON.stringify({
            page,
            search,
          }),
          headers,
        });

        actions.setSearchResults(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    fetchGroupUsers: async ({ groupId }) => {
      actions.setAllGroupLoading(true);
      try {
        const response = await HttpLogic.values.http.get(
          `/api/workplace_search/groups/${groupId}/group_users`
        );
        actions.setGroupUsers(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    saveNewGroup: async () => {
      try {
        const response = await HttpLogic.values.http.post('/api/workplace_search/groups', {
          body: JSON.stringify({ group_name: values.newGroupName }),
          headers,
        });
        actions.getSearchResults(true);

        const SUCCESS_MESSAGE = i18n.translate(
          'xpack.enterpriseSearch.workplaceSearch.groups.newGroupSavedSuccess',
          {
            defaultMessage: 'Successfully created {groupName}',
            values: { groupName: response.name },
          }
        );

        setSuccessMessage(SUCCESS_MESSAGE);
        actions.setNewGroup(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    setActivePage: () => {
      actions.getSearchResults();
    },
    openNewGroupModal: () => {
      FlashMessagesLogic.actions.clearFlashMessages();
    },
    resetGroupsFilters: () => {
      FlashMessagesLogic.actions.clearFlashMessages();
    },
    toggleFilterSourcesDropdown: () => {
      FlashMessagesLogic.actions.clearFlashMessages();
    },
    toggleFilterUsersDropdown: () => {
      FlashMessagesLogic.actions.clearFlashMessages();
    },
  }),
});
