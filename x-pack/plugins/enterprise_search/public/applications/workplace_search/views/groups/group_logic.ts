/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kea, MakeLogicType } from 'kea';
import { isEqual } from 'lodash';
import { i18n } from '@kbn/i18n';

import { HttpLogic } from '../../../shared/http';
import { KibanaLogic } from '../../../shared/kibana';

import {
  FlashMessagesLogic,
  flashAPIErrors,
  setSuccessMessage,
  setQueuedSuccessMessage,
} from '../../../shared/flash_messages';
import { GROUPS_PATH } from '../../routes';

import { ContentSourceDetails, GroupDetails, User, SourcePriority } from '../../types';

export const MAX_NAME_LENGTH = 40;

interface GroupActions {
  onInitializeGroup(group: GroupDetails): GroupDetails;
  onGroupNameChanged(group: GroupDetails): GroupDetails;
  onGroupPrioritiesChanged(group: GroupDetails): GroupDetails;
  onGroupNameInputChange(groupName: string): string;
  addGroupSource(sourceId: string): string;
  removeGroupSource(sourceId: string): string;
  addGroupUser(userId: string): string;
  removeGroupUser(userId: string): string;
  onGroupSourcesSaved(group: GroupDetails): GroupDetails;
  onGroupUsersSaved(group: GroupDetails): GroupDetails;
  setGroupModalErrors(errors: string[]): string[];
  hideSharedSourcesModal(group: GroupDetails): GroupDetails;
  hideManageUsersModal(group: GroupDetails): GroupDetails;
  selectAllSources(contentSources: ContentSourceDetails[]): ContentSourceDetails[];
  selectAllUsers(users: User[]): User[];
  updatePriority(id: string, boost: number): { id: string; boost: number };
  resetGroup(): void;
  showConfirmDeleteModal(): void;
  hideConfirmDeleteModal(): void;
  showSharedSourcesModal(): void;
  showManageUsersModal(): void;
  resetFlashMessages(): void;
  initializeGroup(groupId: string): { groupId: string };
  deleteGroup(): void;
  updateGroupName(): void;
  saveGroupSources(): void;
  saveGroupUsers(): void;
  saveGroupSourcePrioritization(): void;
}

interface GroupValues {
  group: GroupDetails;
  dataLoading: boolean;
  manageUsersModalVisible: boolean;
  managerModalFormErrors: string[];
  sharedSourcesModalVisible: boolean;
  confirmDeleteModalVisible: boolean;
  groupNameInputValue: string;
  selectedGroupSources: string[];
  selectedGroupUsers: string[];
  groupPrioritiesUnchanged: boolean;
  activeSourcePriorities: SourcePriority;
  cachedSourcePriorities: SourcePriority;
}

export const GroupLogic = kea<MakeLogicType<GroupValues, GroupActions>>({
  path: ['enterprise_search', 'workplace_search', 'group'],
  actions: {
    onInitializeGroup: (group) => group,
    onGroupNameChanged: (group) => group,
    onGroupPrioritiesChanged: (group) => group,
    onGroupNameInputChange: (groupName) => groupName,
    addGroupSource: (sourceId) => sourceId,
    removeGroupSource: (sourceId) => sourceId,
    addGroupUser: (userId) => userId,
    removeGroupUser: (userId) => userId,
    onGroupSourcesSaved: (group) => group,
    onGroupUsersSaved: (group) => group,
    setGroupModalErrors: (errors) => errors,
    hideSharedSourcesModal: (group) => group,
    hideManageUsersModal: (group) => group,
    selectAllSources: (contentSources) => contentSources,
    selectAllUsers: (users) => users,
    updatePriority: (id, boost) => ({ id, boost }),
    resetGroup: () => true,
    showConfirmDeleteModal: () => true,
    hideConfirmDeleteModal: () => true,
    showSharedSourcesModal: () => true,
    showManageUsersModal: () => true,
    resetFlashMessages: () => true,
    initializeGroup: (groupId) => ({ groupId }),
    deleteGroup: () => true,
    updateGroupName: () => true,
    saveGroupSources: () => true,
    saveGroupUsers: () => true,
    saveGroupSourcePrioritization: () => true,
  },
  reducers: {
    group: [
      {} as GroupDetails,
      {
        onInitializeGroup: (_, group) => group,
        onGroupNameChanged: (_, group) => group,
        onGroupSourcesSaved: (_, group) => group,
        onGroupUsersSaved: (_, group) => group,
        resetGroup: () => ({} as GroupDetails),
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
    sharedSourcesModalVisible: [
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
    initializeGroup: async ({ groupId }) => {
      try {
        const response = await HttpLogic.values.http.get(`/api/workplace_search/groups/${groupId}`);
        actions.onInitializeGroup(response);
      } catch (e) {
        const NOT_FOUND_MESSAGE = i18n.translate(
          'xpack.enterpriseSearch.workplaceSearch.groups.groupNotFound',
          {
            defaultMessage: 'Unable to find group with ID: "{groupId}".',
            values: { groupId },
          }
        );

        const error = e.response?.status === 404 ? NOT_FOUND_MESSAGE : e;
        FlashMessagesLogic.actions.setQueuedMessages({
          type: 'error',
          message: error,
        });

        KibanaLogic.values.navigateToUrl(GROUPS_PATH);
      }
    },
    deleteGroup: async () => {
      const {
        group: { id, name },
      } = values;
      try {
        await HttpLogic.values.http.delete(`/api/workplace_search/groups/${id}`);
        const GROUP_DELETED_MESSAGE = i18n.translate(
          'xpack.enterpriseSearch.workplaceSearch.groups.groupDeleted',
          {
            defaultMessage: 'Group "{groupName}" was successfully deleted.',
            values: { groupName: name },
          }
        );

        setQueuedSuccessMessage(GROUP_DELETED_MESSAGE);
        KibanaLogic.values.navigateToUrl(GROUPS_PATH);
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

        const GROUP_RENAMED_MESSAGE = i18n.translate(
          'xpack.enterpriseSearch.workplaceSearch.groups.groupRenamed',
          {
            defaultMessage: 'Successfully renamed this group to "{groupName}".',
            values: { groupName: response.name },
          }
        );
        setSuccessMessage(GROUP_RENAMED_MESSAGE);
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
        const GROUP_SOURCES_UPDATED_MESSAGE = i18n.translate(
          'xpack.enterpriseSearch.workplaceSearch.groups.groupSourcesUpdated',
          {
            defaultMessage: 'Successfully updated shared content sources.',
          }
        );
        setSuccessMessage(GROUP_SOURCES_UPDATED_MESSAGE);
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
        const GROUP_USERS_UPDATED_MESSAGE = i18n.translate(
          'xpack.enterpriseSearch.workplaceSearch.groups.groupUsersUpdated',
          {
            defaultMessage: 'Successfully updated the users of this group.',
          }
        );
        setSuccessMessage(GROUP_USERS_UPDATED_MESSAGE);
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

        const GROUP_PRIORITIZATION_UPDATED_MESSAGE = i18n.translate(
          'xpack.enterpriseSearch.workplaceSearch.groups.groupPrioritizationUpdated',
          {
            defaultMessage: 'Successfully updated shared source prioritization.',
          }
        );

        setSuccessMessage(GROUP_PRIORITIZATION_UPDATED_MESSAGE);
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

const mapPriorities = (contentSources: ContentSourceDetails[]): SourcePriority => {
  const prioritiesMap = {} as SourcePriority;
  contentSources.forEach(({ id, boost }) => {
    prioritiesMap[id] = boost;
  });

  return prioritiesMap;
};
