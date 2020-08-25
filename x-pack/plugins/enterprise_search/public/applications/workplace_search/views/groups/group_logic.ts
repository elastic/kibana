/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _isEqual from 'lodash/isEqual';

import { storeLogic } from 'shared/store';

import http from 'shared/http';
import routes from 'workplace_search/routes';
import { GROUPS_PATH } from 'workplace_search/utils/routePaths';

import { IFlashMessagesProps } from 'shared/types';
import { IGroup, IObject, IContentSource, IGroupDetails, IUser } from 'workplace_search/types';

import GroupsLogic from './GroupsLogic';

export const MAX_NAME_LENGTH = 40;

export interface IGroupActions {
  setFlashMessages(flashMessages: IFlashMessagesProps);
  onInitializeGroup(group: IGroup);
  onGroupNameChanged(group: IGroup);
  onGroupPrioritiesChanged(group: IGroup);
  onGroupNameInputChange(groupName: string);
  addGroupSource(sourceId: string);
  removeGroupSource(sourceId: string);
  addGroupUser(userId: string);
  removeGroupUser(userId: string);
  onGroupSourcesSaved(groupSources: string[]);
  onGroupUsersSaved(group: IGroup);
  setGroupModalErrors(errors: string[]);
  hideSharedSourcesModal(group: IGroup);
  hideManageUsersModal(group: IGroup);
  selectAllSources(contentSources: IContentSource[]);
  selectAllUsers(users: IUser[]);
  updatePriority(id: string, boost: number);
  resetGroup();
  showConfirmDeleteModal();
  hideConfirmDeleteModal();
  showSharedSourcesModal();
  showManageUsersModal();
  resetFlashMessages();
  initializeGroup(groupId: string, history: IObject);
  deleteGroup(history: IObject);
  updateGroupName();
  saveGroupSources();
  saveGroupUsers();
  saveGroupSourcePrioritization();
}

export interface IGroupValues {
  contentSources: IContentSource[];
  users: IUser[];
  flashMessages?: IFlashMessagesProps;
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
  activeSourcePriorities: IObject;
}

interface IListenerParams {
  actions: IGroupActions;
  values: IGroupValues;
}

export const GroupLogic = storeLogic({
  actions: (): IGroupActions => ({
    setFlashMessages: (flashMessages: IFlashMessagesProps) => ({ flashMessages }),
    onInitializeGroup: (group: IGroup) => group,
    onGroupNameChanged: (group: IGroup) => group,
    onGroupPrioritiesChanged: (group: IGroup) => group,
    onGroupNameInputChange: (groupName: string) => groupName,
    addGroupSource: (sourceId: string) => sourceId,
    removeGroupSource: (sourceId: string) => sourceId,
    addGroupUser: (userId: string) => userId,
    removeGroupUser: (userId: string) => userId,
    onGroupSourcesSaved: (groupSources: string[]) => groupSources,
    onGroupUsersSaved: (group: IGroup) => group,
    setGroupModalErrors: (errors: string[]) => errors,
    hideSharedSourcesModal: (group: IGroup) => group,
    hideManageUsersModal: (group: IGroup) => group,
    selectAllSources: (contentSources: IContentSource[]) => contentSources,
    selectAllUsers: (users: IUser[]) => users,
    updatePriority: (id: string, boost: number) => ({ id, boost }),
    resetGroup: () => true,
    showConfirmDeleteModal: () => true,
    hideConfirmDeleteModal: () => true,
    showSharedSourcesModal: () => true,
    showManageUsersModal: () => true,
    resetFlashMessages: () => true,
    initializeGroup: (groupId: string, history: IObject) => ({ groupId, history }),
    deleteGroup: (history: IObject) => ({ history }),
    updateGroupName: () => true,
    saveGroupSources: () => true,
    saveGroupUsers: () => true,
    saveGroupSourcePrioritization: () => true,
  }),
  reducers: () => ({
    flashMessages: [
      {},
      {
        setFlashMessages: (_, { flashMessages }) => flashMessages,
        onGroupNameChanged: (_, { name }) => ({
          success: [`Successfully renamed this group to '${name}'`],
        }),
        onGroupUsersSaved: () => ({ success: ['Successfully updated the users of this group'] }),
        onGroupSourcesSaved: () => ({ success: ['Successfully updated shared content sources'] }),
        onGroupPrioritiesChanged: () => ({
          success: ['Successfully updated shared source prioritization'],
        }),
        showConfirmDeleteModal: () => ({}),
        showManageUsersModal: () => ({}),
        showSharedSourcesModal: () => ({}),
        resetFlashMessages: () => ({}),
      },
    ],
    group: [
      {},
      {
        onInitializeGroup: (_, group) => group,
        onGroupNameChanged: (_, group) => group,
        onGroupSourcesSaved: (_, group) => group,
        onGroupUsersSaved: (_, group) => group,
        resetGroup: () => ({}),
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
          updated[id] = parseInt(boost, 10);
          return updated;
        },
      },
    ],
  }),
  selectors: ({ selectors }) => ({
    groupPrioritiesUnchanged: [
      () => [selectors.cachedSourcePriorities, selectors.activeSourcePriorities],
      (cached, active) => _isEqual(cached, active),
    ],
  }),
  listeners: ({ actions, values }: IListenerParams) => ({
    initializeGroup: ({ groupId, history }) => {
      const route = routes.fritoPieOrganizationGroupPath(groupId);
      http(route)
        .then(({ data }) => actions.onInitializeGroup(data))
        .catch(({ response }) => {
          history.push(GROUPS_PATH);
          const error =
            response.status === 404
              ? [`Unable to find group with ID: ${groupId}`]
              : response.data.errors;
          GroupsLogic.actions.setFlashMessages({ error });
        });
    },
    deleteGroup: ({ history }) => {
      const {
        group: { id, name },
      } = values;
      const route = routes.fritoPieOrganizationGroupPath(id);
      http
        .delete(route)
        .then(() => {
          history.push(GROUPS_PATH);
          GroupsLogic.actions.setFlashMessages({
            success: [`Group ${name} was successfully deleted`],
          });
        })
        .catch(({ response }) => actions.setFlashMessages({ error: response.data.errors }));
    },
    updateGroupName: () => {
      const {
        group: { id },
        groupNameInputValue,
      } = values;
      const route = routes.fritoPieOrganizationGroupPath(id);
      http
        .put(route, { group: { name: groupNameInputValue } })
        .then(({ data }) => actions.onGroupNameChanged(data))
        .catch(({ response }) => actions.setFlashMessages({ error: response.data.errors }));
    },
    saveGroupSources: () => {
      const {
        group: { id },
        selectedGroupSources,
      } = values;
      const route = routes.shareFritoPieOrganizationGroupPath(id);
      http
        .post(route, { content_source_ids: selectedGroupSources })
        .then(({ data }) => actions.onGroupSourcesSaved(data))
        .catch(({ response }) => actions.setGroupModalErrors(response.data.errors));
    },
    saveGroupUsers: () => {
      const {
        group: { id },
        selectedGroupUsers,
      } = values;
      const route = routes.assignFritoPieOrganizationGroupPath(id);
      http
        .post(route, { user_ids: selectedGroupUsers })
        .then(({ data }) => actions.onGroupUsersSaved(data))
        .catch(({ response }) => actions.setGroupModalErrors(response.data.errors));
    },
    saveGroupSourcePrioritization: () => {
      const {
        group: { id },
        activeSourcePriorities,
      } = values;
      const route = routes.updateSourceBoostsFritoPieOrganizationGroupPath(id);

      // server expects an array of id, value for each boost.
      // example: [['123abc', 7], ['122abv', 1]]
      const boosts = [] as Array<Array<string | number>>;
      Object.keys(activeSourcePriorities).forEach((k) =>
        boosts.push([k, activeSourcePriorities[k]])
      );

      http
        .put(route, { content_source_boosts: boosts })
        .then(({ data }) => actions.onGroupPrioritiesChanged(data))
        .catch(({ response }) => actions.setFlashMessages({ error: response.data.errors }));
    },
  }),
});

const mapPriorities = (contentSources) => {
  const prioritiesMap = {} as IObject;
  contentSources.forEach(({ id, boost }) => {
    prioritiesMap[id] = boost;
  });

  return prioritiesMap;
};
