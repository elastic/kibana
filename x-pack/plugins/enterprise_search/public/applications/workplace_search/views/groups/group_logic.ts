/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';
import { isEqual } from 'lodash';

import { i18n } from '@kbn/i18n';

import {
  clearFlashMessages,
  flashAPIErrors,
  flashSuccessToast,
  setQueuedErrorMessage,
} from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import { KibanaLogic } from '../../../shared/kibana';
import { GROUPS_PATH } from '../../routes';
import { ContentSourceDetails, GroupDetails, SourcePriority } from '../../types';

export const MAX_NAME_LENGTH = 40;

interface GroupActions {
  onInitializeGroup(group: GroupDetails): GroupDetails;
  onGroupNameChanged(group: GroupDetails): GroupDetails;
  onGroupPrioritiesChanged(group: GroupDetails): GroupDetails;
  onGroupNameInputChange(groupName: string): string;
  addGroupSource(sourceId: string): string;
  removeGroupSource(sourceId: string): string;
  onGroupSourcesSaved(group: GroupDetails): GroupDetails;
  setGroupModalErrors(errors: string[]): string[];
  hideOrgSourcesModal(group: GroupDetails): GroupDetails;
  selectAllSources(contentSources: ContentSourceDetails[]): ContentSourceDetails[];
  updatePriority(id: string, boost: number): { id: string; boost: number };
  resetGroup(): void;
  showConfirmDeleteModal(): void;
  hideConfirmDeleteModal(): void;
  showOrgSourcesModal(): void;
  resetFlashMessages(): void;
  initializeGroup(groupId: string): { groupId: string };
  deleteGroup(): void;
  updateGroupName(): void;
  saveGroupSources(): void;
  saveGroupSourcePrioritization(): void;
}

interface GroupValues {
  group: GroupDetails;
  dataLoading: boolean;
  managerModalFormErrors: string[];
  orgSourcesModalVisible: boolean;
  confirmDeleteModalVisible: boolean;
  groupNameInputValue: string;
  selectedGroupSources: string[];
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
    onGroupSourcesSaved: (group) => group,
    setGroupModalErrors: (errors) => errors,
    hideOrgSourcesModal: (group) => group,
    selectAllSources: (contentSources) => contentSources,
    updatePriority: (id, boost) => ({ id, boost }),
    resetGroup: () => true,
    showConfirmDeleteModal: () => true,
    hideConfirmDeleteModal: () => true,
    showOrgSourcesModal: () => true,
    resetFlashMessages: () => true,
    initializeGroup: (groupId) => ({ groupId }),
    deleteGroup: () => true,
    updateGroupName: () => true,
    saveGroupSources: () => true,
    saveGroupSourcePrioritization: () => true,
  },
  reducers: {
    group: [
      {} as GroupDetails,
      {
        onInitializeGroup: (_, group) => group,
        onGroupNameChanged: (_, group) => group,
        onGroupSourcesSaved: (_, group) => group,
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
    managerModalFormErrors: [
      [],
      {
        setGroupModalErrors: (_, errors) => errors,
      },
    ],
    orgSourcesModalVisible: [
      false,
      {
        showOrgSourcesModal: () => true,
        hideOrgSourcesModal: () => false,
        onGroupSourcesSaved: () => false,
      },
    ],
    confirmDeleteModalVisible: [
      false,
      {
        showConfirmDeleteModal: () => true,
        hideConfirmDeleteModal: () => false,
        deleteGroup: () => false,
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
        hideOrgSourcesModal: (_, { contentSources }) => contentSources.map(({ id }) => id),
        addGroupSource: (state, sourceId) => [...state, sourceId].sort(),
        removeGroupSource: (state, sourceId) => state.filter((id) => id !== sourceId),
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
        const response = await HttpLogic.values.http.get<GroupDetails>(
          `/internal/workplace_search/groups/${groupId}`
        );
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
        setQueuedErrorMessage(error);

        KibanaLogic.values.navigateToUrl(GROUPS_PATH);
      }
    },
    deleteGroup: async () => {
      const {
        group: { id, name },
      } = values;
      try {
        await HttpLogic.values.http.delete(`/internal/workplace_search/groups/${id}`);
        const GROUP_DELETED_MESSAGE = i18n.translate(
          'xpack.enterpriseSearch.workplaceSearch.groups.groupDeleted',
          {
            defaultMessage: 'Group "{groupName}" was successfully deleted.',
            values: { groupName: name },
          }
        );

        flashSuccessToast(GROUP_DELETED_MESSAGE);
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
        const response = await HttpLogic.values.http.put<GroupDetails>(
          `/internal/workplace_search/groups/${id}`,
          {
            body: JSON.stringify({ group: { name: groupNameInputValue } }),
          }
        );
        actions.onGroupNameChanged(response);

        const GROUP_RENAMED_MESSAGE = i18n.translate(
          'xpack.enterpriseSearch.workplaceSearch.groups.groupRenamed',
          {
            defaultMessage: 'Successfully renamed this group to "{groupName}".',
            values: { groupName: response.name },
          }
        );
        flashSuccessToast(GROUP_RENAMED_MESSAGE);
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
        const response = await HttpLogic.values.http.post<GroupDetails>(
          `/internal/workplace_search/groups/${id}/share`,
          {
            body: JSON.stringify({ content_source_ids: selectedGroupSources }),
          }
        );
        actions.onGroupSourcesSaved(response);
        const GROUP_SOURCES_UPDATED_MESSAGE = i18n.translate(
          'xpack.enterpriseSearch.workplaceSearch.groups.groupSourcesUpdated',
          {
            defaultMessage: 'Successfully updated organizational content sources.',
          }
        );
        flashSuccessToast(GROUP_SOURCES_UPDATED_MESSAGE);
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
        const response = await HttpLogic.values.http.put<GroupDetails>(
          `/internal/workplace_search/groups/${id}/boosts`,
          {
            body: JSON.stringify({ content_source_boosts: boosts }),
          }
        );

        const GROUP_PRIORITIZATION_UPDATED_MESSAGE = i18n.translate(
          'xpack.enterpriseSearch.workplaceSearch.groups.groupPrioritizationUpdated',
          {
            defaultMessage: 'Successfully updated organizational source prioritization.',
          }
        );

        flashSuccessToast(GROUP_PRIORITIZATION_UPDATED_MESSAGE);
        actions.onGroupPrioritiesChanged(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    showConfirmDeleteModal: () => {
      clearFlashMessages();
    },
    showOrgSourcesModal: () => {
      clearFlashMessages();
    },
    resetFlashMessages: () => {
      clearFlashMessages();
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
