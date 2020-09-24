/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kea, MakeLogicType } from 'kea';
import { isEqual } from 'lodash';
import { History } from 'history';

import { HttpLogic } from '../../../shared/http';
import {
  FlashMessagesLogic,
  flashAPIErrors,
  setSuccessMessage,
  setQueuedSuccessMessage,
} from '../../../shared/flash_messages';
import { GROUPS_PATH } from '../../routes';

import { IContentSourceDetails, IGroupDetails, IUser, ISourcePriority } from '../../types';

export const MAX_NAME_LENGTH = 40;

export interface IGroupActions {
  onInitializeGroup(group: IGroupDetails): IGroupDetails;
  onGroupNameChanged(group: IGroupDetails): IGroupDetails;
  onGroupPrioritiesChanged(group: IGroupDetails): IGroupDetails;
  onGroupNameInputChange(groupName: string): string;
  addGroupSource(sourceId: string): string;
  removeGroupSource(sourceId: string): string;
  addGroupUser(userId: string): string;
  removeGroupUser(userId: string): string;
  onGroupSourcesSaved(group: IGroupDetails): IGroupDetails;
  onGroupUsersSaved(group: IGroupDetails): IGroupDetails;
  setGroupModalErrors(errors: string[]): string[];
  hideSharedSourcesModal(group: IGroupDetails): IGroupDetails;
  hideManageUsersModal(group: IGroupDetails): IGroupDetails;
  selectAllSources(contentSources: IContentSourceDetails[]): IContentSourceDetails[];
  selectAllUsers(users: IUser[]): IUser[];
  updatePriority(id: string, boost: number): { id: string; boost: number };
  resetGroup(): void;
  showConfirmDeleteModal(): void;
  hideConfirmDeleteModal(): void;
  showSharedSourcesModal(): void;
  showManageUsersModal(): void;
  resetFlashMessages(): void;
  initializeGroup(groupId: string, history: History): { groupId: string; history: History };
  deleteGroup(history: History): { history: History };
  updateGroupName(): void;
  saveGroupSources(): void;
  saveGroupUsers(): void;
  saveGroupSourcePrioritization(): void;
}

export interface IGroupValues {
  contentSources: IContentSourceDetails[];
  users: IUser[];
  group: IGroupDetails;
  dataLoading: boolean;
  manageUsersModalVisible: boolean;
  managerModalFormErrors: string[];
  sharedSourcesModalModalVisible: boolean;
  confirmDeleteModalVisible: boolean;
  groupNameInputValue: string;
  selectedGroupSources: string[];
  selectedGroupUsers: string[];
  groupPrioritiesUnchanged: boolean;
  activeSourcePriorities: ISourcePriority;
  cachedSourcePriorities: ISourcePriority;
}

export const GroupLogic = kea<MakeLogicType<IGroupValues, IGroupActions>>({
  path: ['enterprise_search', 'workplace_search', 'group'],
  actions: {
    onInitializeGroup: (group: IGroupDetails) => group,
    onGroupNameChanged: (group: IGroupDetails) => group,
    onGroupPrioritiesChanged: (group: IGroupDetails) => group,
    onGroupNameInputChange: (groupName: string) => groupName,
    addGroupSource: (sourceId: string) => sourceId,
    removeGroupSource: (sourceId: string) => sourceId,
    addGroupUser: (userId: string) => userId,
    removeGroupUser: (userId: string) => userId,
    onGroupSourcesSaved: (group: IGroupDetails) => group,
    onGroupUsersSaved: (group: IGroupDetails) => group,
    setGroupModalErrors: (errors: string[]) => errors,
    hideSharedSourcesModal: (group: IGroupDetails) => group,
    hideManageUsersModal: (group: IGroupDetails) => group,
    selectAllSources: (contentSources: IContentSourceDetails[]) => contentSources,
    selectAllUsers: (users: IUser[]) => users,
    updatePriority: (id: string, boost: number) => ({ id, boost }),
    resetGroup: () => true,
    showConfirmDeleteModal: () => true,
    hideConfirmDeleteModal: () => true,
    showSharedSourcesModal: () => true,
    showManageUsersModal: () => true,
    resetFlashMessages: () => true,
    initializeGroup: (groupId: string, history: History) => ({ groupId, history }),
    deleteGroup: (history: History) => ({ history }),
    updateGroupName: () => true,
    saveGroupSources: () => true,
    saveGroupUsers: () => true,
    saveGroupSourcePrioritization: () => true,
  },
  reducers: {
    group: [
      {} as IGroupDetails,
      {
        onInitializeGroup: (_, group) => group,
        onGroupNameChanged: (_, group) => group,
        onGroupSourcesSaved: (_, group) => group,
        onGroupUsersSaved: (_, group) => group,
        resetGroup: () => ({} as IGroupDetails),
      },
    ],
    dataLoading: [
      true,
      {
        onInitializeGroup: () => false,
        onGroupPrioritiesChanged: () => false,
        resetGroup: () => true,
      },
    ],
    manageUsersModalVisible: [
      false,
      {
        showManageUsersModal: () => true,
        hideManageUsersModal: () => false,
        onGroupUsersSaved: () => false,
      },
    ],
    managerModalFormErrors: [
      [],
      {
        setGroupModalErrors: (_, errors) => errors,
        hideManageUsersModal: () => [],
      },
    ],
    sharedSourcesModalModalVisible: [
      false,
      {
        showSharedSourcesModal: () => true,
        hideSharedSourcesModal: () => false,
        onGroupSourcesSaved: () => false,
      },
    ],
    confirmDeleteModalVisible: [
      false,
      {
        showConfirmDeleteModal: () => true,
        hideConfirmDeleteModal: () => false,
      },
    ],
    groupNameInputValue: [
      '',
      {
        onInitializeGroup: (_, { name }) => name,
        onGroupNameChanged: (_, { name }) => name,
        onGroupNameInputChange: (_, name) => name,
      },
    ],
    selectedGroupSources: [
      [],
      {
        onInitializeGroup: (_, { contentSources }) => contentSources.map(({ id }) => id),
        onGroupSourcesSaved: (_, { contentSources }) => contentSources.map(({ id }) => id),
        selectAllSources: (_, contentSources) => contentSources.map(({ id }) => id),
        hideSharedSourcesModal: (_, { contentSources }) => contentSources.map(({ id }) => id),
        addGroupSource: (state, sourceId) => [...state, sourceId].sort(),
        removeGroupSource: (state, sourceId) => state.filter((id) => id !== sourceId),
      },
    ],
    selectedGroupUsers: [
      [],
      {
        onInitializeGroup: (_, { users }) => users.map(({ id }) => id),
        onGroupUsersSaved: (_, { users }) => users.map(({ id }) => id),
        selectAllUsers: (_, users) => users.map(({ id }) => id),
        hideManageUsersModal: (_, { users }) => users.map(({ id }) => id),
        addGroupUser: (state, userId) => [...state, userId].sort(),
        removeGroupUser: (state, userId) => state.filter((id) => id !== userId),
      },
    ],
    cachedSourcePriorities: [
      {},
      {
        onInitializeGroup: (_, { contentSources }) => mapPriorities(contentSources),
        onGroupPrioritiesChanged: (_, { contentSources }) => mapPriorities(contentSources),
        onGroupSourcesSaved: (_, { contentSources }) => mapPriorities(contentSources),
      },
    ],
    activeSourcePriorities: [
      {},
      {
        onInitializeGroup: (_, { contentSources }) => mapPriorities(contentSources),
        onGroupPrioritiesChanged: (_, { contentSources }) => mapPriorities(contentSources),
        onGroupSourcesSaved: (_, { contentSources }) => mapPriorities(contentSources),
        updatePriority: (state, { id, boost }) => {
          const updated = { ...state };
          updated[id] = boost;
          return updated;
        },
      },
    ],
  },
  selectors: ({ selectors }) => ({
    groupPrioritiesUnchanged: [
      () => [selectors.cachedSourcePriorities, selectors.activeSourcePriorities],
      (cached, active) => isEqual(cached, active),
    ],
  }),
  listeners: ({ actions, values }) => ({
    initializeGroup: async ({ groupId, history }) => {
      try {
        const response = await HttpLogic.values.http.get(`/api/workplace_search/groups/${groupId}`);
        actions.onInitializeGroup(response);
      } catch (e) {
        history.push(GROUPS_PATH);

        const error = e.response.status === 404 ? `Unable to find group with ID: ${groupId}` : e;

        FlashMessagesLogic.actions.setQueuedMessages({
          type: 'error',
          message: error,
        });
      }
    },
    deleteGroup: async ({ history }) => {
      const {
        group: { id, name },
      } = values;
      try {
        await HttpLogic.values.http.delete(`/api/workplace_search/groups/${id}`);
        history.push(GROUPS_PATH);
        setQueuedSuccessMessage(`Group "${name}" was successfully deleted`);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    updateGroupName: async () => {
      const {
        group: { id },
        groupNameInputValue,
      } = values;

      try {
        const response = await HttpLogic.values.http.put(`/api/workplace_search/groups/${id}`, {
          body: JSON.stringify({ group: { name: groupNameInputValue } }),
        });
        actions.onGroupNameChanged(response);
        setSuccessMessage(`Successfully renamed this group to "${response.name}".`);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    saveGroupSources: async () => {
      const {
        group: { id },
        selectedGroupSources,
      } = values;

      try {
        const response = await HttpLogic.values.http.post(
          `/api/workplace_search/groups/${id}/share`,
          {
            body: JSON.stringify({ content_source_ids: selectedGroupSources }),
          }
        );
        actions.onGroupSourcesSaved(response);
        setSuccessMessage('Successfully updated shared content sources');
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    saveGroupUsers: async () => {
      const {
        group: { id },
        selectedGroupUsers,
      } = values;

      try {
        const response = await HttpLogic.values.http.post(
          `/api/workplace_search/groups/${id}/assign`,
          {
            body: JSON.stringify({ user_ids: selectedGroupUsers }),
          }
        );
        actions.onGroupUsersSaved(response);
        setSuccessMessage('Successfully updated the users of this group');
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    saveGroupSourcePrioritization: async () => {
      const {
        group: { id },
        activeSourcePriorities,
      } = values;

      // server expects an array of id, value for each boost.
      // example: [['123abc', 7], ['122abv', 1]]
      const boosts = [] as Array<Array<string | number>>;
      Object.keys(activeSourcePriorities).forEach((k: string) =>
        boosts.push([k, Number(activeSourcePriorities[k])])
      );

      try {
        const response = await HttpLogic.values.http.put(
          `/api/workplace_search/groups/${id}/boosts`,
          {
            body: JSON.stringify({ content_source_boosts: boosts }),
          }
        );
        setSuccessMessage('Successfully updated shared source prioritization');
        actions.onGroupPrioritiesChanged(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    showConfirmDeleteModal: () => {
      FlashMessagesLogic.actions.clearFlashMessages();
    },
    showManageUsersModal: () => {
      FlashMessagesLogic.actions.clearFlashMessages();
    },
    showSharedSourcesModal: () => {
      FlashMessagesLogic.actions.clearFlashMessages();
    },
    resetFlashMessages: () => {
      FlashMessagesLogic.actions.clearFlashMessages();
    },
  }),
});

const mapPriorities = (contentSources: IContentSourceDetails[]): ISourcePriority => {
  const prioritiesMap = {} as ISourcePriority;
  contentSources.forEach(({ id, boost }) => {
    prioritiesMap[id] = boost;
  });

  return prioritiesMap;
};
