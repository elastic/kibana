/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import {
  clearFlashMessages,
  flashAPIErrors,
  flashSuccessToast,
} from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import {
  RoleMappingsBaseServerDetails,
  RoleMappingsBaseActions,
  RoleMappingsBaseValues,
} from '../../../shared/role_mapping';
import { AttributeName, SingleUserRoleMapping, ElasticsearchUser } from '../../../shared/types';
import { RoleGroup, WSRoleMapping, Role } from '../../types';

import {
  ROLE_MAPPING_DELETED_MESSAGE,
  ROLE_MAPPING_CREATED_MESSAGE,
  ROLE_MAPPING_UPDATED_MESSAGE,
  DEFAULT_GROUP_NAME,
} from './constants';

type UserMapping = SingleUserRoleMapping<WSRoleMapping>;

interface RoleMappingsServerDetails extends RoleMappingsBaseServerDetails {
  roleMappings: WSRoleMapping[];
  availableGroups: RoleGroup[];
  singleUserRoleMappings: UserMapping[];
}

const getFirstAttributeName = (roleMapping: WSRoleMapping): AttributeName =>
  Object.entries(roleMapping.rules)[0][0] as AttributeName;
const getFirstAttributeValue = (roleMapping: WSRoleMapping): string =>
  Object.entries(roleMapping.rules)[0][1] as string;
const emptyUser = { username: '', email: '' } as ElasticsearchUser;

interface RoleMappingsActions extends RoleMappingsBaseActions {
  setDefaultGroup(availableGroups: RoleGroup[]): { availableGroups: RoleGroup[] };
  setRoleMapping(roleMapping: WSRoleMapping): { roleMapping: WSRoleMapping };
  setSingleUserRoleMapping(data?: UserMapping): { singleUserRoleMapping: UserMapping };
  setRoleMappings({ roleMappings }: { roleMappings: WSRoleMapping[] }): {
    roleMappings: WSRoleMapping[];
  };
  setRoleMappingsData(data: RoleMappingsServerDetails): RoleMappingsServerDetails;
  handleAllGroupsSelectionChange(selected: boolean): { selected: boolean };
  handleGroupSelectionChange(groupIds: string[]): { groupIds: string[] };
  handleRoleChange(roleType: Role): { roleType: Role };
}

interface RoleMappingsValues extends RoleMappingsBaseValues {
  includeInAllGroups: boolean;
  availableGroups: RoleGroup[];
  roleMapping: WSRoleMapping | null;
  roleMappings: WSRoleMapping[];
  singleUserRoleMapping: UserMapping | null;
  singleUserRoleMappings: UserMapping[];
  roleType: Role;
  selectedGroups: Set<string>;
}

export const RoleMappingsLogic = kea<MakeLogicType<RoleMappingsValues, RoleMappingsActions>>({
  path: ['enterprise_search', 'workplace_search', 'users_and_roles'],
  actions: {
    setRoleMappingsData: (data: RoleMappingsServerDetails) => data,
    setRoleMapping: (roleMapping: WSRoleMapping) => ({ roleMapping }),
    setElasticsearchUser: (elasticsearchUser: ElasticsearchUser) => ({ elasticsearchUser }),
    setSingleUserRoleMapping: (singleUserRoleMapping: UserMapping) => ({ singleUserRoleMapping }),
    setRoleMappings: ({ roleMappings }: { roleMappings: WSRoleMapping[] }) => ({ roleMappings }),
    setRoleMappingErrors: (errors: string[]) => ({ errors }),
    handleRoleChange: (roleType: Role) => ({ roleType }),
    handleUsernameSelectChange: (username: string) => ({ username }),
    handleGroupSelectionChange: (groupIds: string[]) => ({ groupIds }),
    handleAttributeSelectorChange: (value: string, firstElasticsearchRole: string) => ({
      value,
      firstElasticsearchRole,
    }),
    handleAttributeValueChange: (value: string) => ({ value }),
    handleAllGroupsSelectionChange: (selected: boolean) => ({ selected }),
    enableRoleBasedAccess: true,
    openSingleUserRoleMappingFlyout: true,
    setUserExistingRadioValue: (userFormUserIsExisting: boolean) => ({ userFormUserIsExisting }),
    resetState: true,
    initializeRoleMappings: true,
    initializeSingleUserRoleMapping: (roleMappingId?: string) => ({ roleMappingId }),
    initializeRoleMapping: (roleMappingId?: string) => ({ roleMappingId }),
    handleDeleteMapping: (roleMappingId: string) => ({ roleMappingId }),
    handleSaveMapping: true,
    handleSaveUser: true,
    setDefaultGroup: (availableGroups: RoleGroup[]) => ({ availableGroups }),
    openRoleMappingFlyout: true,
    closeUsersAndRolesFlyout: false,
    setElasticsearchUsernameValue: (username: string) => ({ username }),
    setElasticsearchEmailValue: (email: string) => ({ email }),
    setUserCreated: true,
    setUserFormIsNewUser: (userFormIsNewUser: boolean) => ({ userFormIsNewUser }),
  },
  reducers: {
    dataLoading: [
      true,
      {
        setRoleMappingsData: () => false,
        setRoleMappings: () => false,
        resetState: () => true,
        enableRoleBasedAccess: () => true,
      },
    ],
    roleMappings: [
      [],
      {
        setRoleMappingsData: (_, { roleMappings }) => roleMappings,
        setRoleMappings: (_, { roleMappings }) => roleMappings,
        resetState: () => [],
      },
    ],
    singleUserRoleMappings: [
      [],
      {
        setRoleMappingsData: (_, { singleUserRoleMappings }) => singleUserRoleMappings,
        resetState: () => [],
      },
    ],
    availableGroups: [
      [],
      {
        setRoleMappingsData: (_, { availableGroups }) => availableGroups,
      },
    ],
    attributes: [
      [],
      {
        setRoleMappingsData: (_, { attributes }) => attributes,
      },
    ],
    elasticsearchRoles: [
      [],
      {
        setRoleMappingsData: (_, { elasticsearchRoles }) => elasticsearchRoles,
      },
    ],
    elasticsearchUsers: [
      [],
      {
        setRoleMappingsData: (_, { elasticsearchUsers }) => elasticsearchUsers,
      },
    ],
    roleMapping: [
      null,
      {
        setRoleMapping: (_, { roleMapping }) => roleMapping,
        initializeRoleMappings: () => null,
        resetState: () => null,
        closeUsersAndRolesFlyout: () => null,
      },
    ],
    singleUserRoleMapping: [
      null,
      {
        setSingleUserRoleMapping: (_, { singleUserRoleMapping }) => singleUserRoleMapping || null,
        closeUsersAndRolesFlyout: () => null,
      },
    ],
    roleType: [
      'admin',
      {
        setRoleMapping: (_, { roleMapping }) => roleMapping.roleType as Role,
        handleRoleChange: (_, { roleType }) => roleType,
      },
    ],
    includeInAllGroups: [
      false,
      {
        setRoleMapping: (_, { roleMapping }) => roleMapping.allGroups,
        handleAllGroupsSelectionChange: (_, { selected }) => selected,
        closeUsersAndRolesFlyout: () => false,
      },
    ],
    attributeValue: [
      '',
      {
        setRoleMapping: (_, { roleMapping }) => getFirstAttributeValue(roleMapping),
        handleAttributeSelectorChange: (_, { value, firstElasticsearchRole }) =>
          value === 'role' ? firstElasticsearchRole : '',
        handleAttributeValueChange: (_, { value }) => value,
        resetState: () => '',
        closeUsersAndRolesFlyout: () => '',
      },
    ],
    attributeName: [
      'username',
      {
        setRoleMapping: (_, { roleMapping }) => getFirstAttributeName(roleMapping),
        handleAttributeSelectorChange: (_, { value }) => value,
        resetState: () => 'username',
        closeUsersAndRolesFlyout: () => 'username',
      },
    ],
    selectedGroups: [
      new Set(),
      {
        setRoleMappingsData: (_, { availableGroups }) =>
          new Set(
            availableGroups
              .filter((group) => group.name === DEFAULT_GROUP_NAME)
              .map((group) => group.id)
          ),
        setDefaultGroup: (_, { availableGroups }) =>
          new Set(
            availableGroups
              .filter((group) => group.name === DEFAULT_GROUP_NAME)
              .map((group) => group.id)
          ),
        setRoleMapping: (_, { roleMapping }) =>
          new Set(roleMapping.groups.map((group: RoleGroup) => group.id)),
        handleGroupSelectionChange: (_, { groupIds }) => {
          const newSelectedGroupNames = new Set() as Set<string>;
          groupIds.forEach((groupId) => newSelectedGroupNames.add(groupId));

          return newSelectedGroupNames;
        },
        closeUsersAndRolesFlyout: () => new Set(),
      },
    ],
    roleMappingFlyoutOpen: [
      false,
      {
        openRoleMappingFlyout: () => true,
        closeUsersAndRolesFlyout: () => false,
        initializeRoleMappings: () => false,
        initializeRoleMapping: () => true,
      },
    ],
    singleUserRoleMappingFlyoutOpen: [
      false,
      {
        openSingleUserRoleMappingFlyout: () => true,
        closeUsersAndRolesFlyout: () => false,
        initializeSingleUserRoleMapping: () => true,
      },
    ],
    roleMappingErrors: [
      [],
      {
        setRoleMappingErrors: (_, { errors }) => errors,
        handleSaveMapping: () => [],
        closeUsersAndRolesFlyout: () => [],
      },
    ],
    userFormUserIsExisting: [
      true,
      {
        setUserExistingRadioValue: (_, { userFormUserIsExisting }) => userFormUserIsExisting,
        closeUsersAndRolesFlyout: () => true,
      },
    ],
    elasticsearchUser: [
      emptyUser,
      {
        setRoleMappingsData: (_, { elasticsearchUsers }) => elasticsearchUsers[0] || emptyUser,
        setElasticsearchUser: (_, { elasticsearchUser }) => elasticsearchUser || emptyUser,
        setElasticsearchUsernameValue: (state, { username }) => ({
          ...state,
          username,
        }),
        setElasticsearchEmailValue: (state, { email }) => ({
          ...state,
          email,
        }),
        closeUsersAndRolesFlyout: () => emptyUser,
      },
    ],
    userCreated: [
      false,
      {
        setUserCreated: () => true,
        closeUsersAndRolesFlyout: () => false,
      },
    ],
    userFormIsNewUser: [
      true,
      {
        setUserFormIsNewUser: (_, { userFormIsNewUser }) => userFormIsNewUser,
      },
    ],
    smtpSettingsPresent: [
      false,
      {
        setRoleMappingsData: (_, { smtpSettingsPresent }) => smtpSettingsPresent,
      },
    ],
    formLoading: [
      false,
      {
        handleSaveMapping: () => true,
        handleSaveUser: () => true,
        initializeRoleMappings: () => false,
        setRoleMappingErrors: () => false,
      },
    ],
  },
  selectors: ({ selectors }) => ({
    selectedOptions: [
      () => [selectors.selectedGroups, selectors.availableGroups],
      (selectedGroups, availableGroups) => {
        const selectedIds = Array.from(selectedGroups.values());
        return availableGroups
          .filter(({ id }: { id: string }) => selectedIds.includes(id))
          .map(({ id, name }: { id: string; name: string }) => ({ label: name, value: id }));
      },
    ],
  }),
  listeners: ({ actions, values }) => ({
    enableRoleBasedAccess: async () => {
      const { http } = HttpLogic.values;
      const route = '/internal/workplace_search/org/role_mappings/enable_role_based_access';

      try {
        const response = await http.post<{
          roleMappings: WSRoleMapping[];
        }>(route);
        actions.setRoleMappings(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    initializeRoleMappings: async () => {
      const { http } = HttpLogic.values;
      const route = '/internal/workplace_search/org/role_mappings';

      try {
        const response = await http.get<RoleMappingsServerDetails>(route);
        actions.setRoleMappingsData(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    initializeRoleMapping: async ({ roleMappingId }) => {
      const roleMapping = values.roleMappings.find(({ id }) => id === roleMappingId);
      if (roleMapping) actions.setRoleMapping(roleMapping);
    },
    initializeSingleUserRoleMapping: ({ roleMappingId }) => {
      const singleUserRoleMapping = values.singleUserRoleMappings.find(
        ({ roleMapping }) => roleMapping.id === roleMappingId
      );

      if (singleUserRoleMapping) {
        actions.setElasticsearchUser(singleUserRoleMapping.elasticsearchUser);
        actions.setRoleMapping(singleUserRoleMapping.roleMapping);
      }
      actions.setSingleUserRoleMapping(singleUserRoleMapping);
      actions.setUserFormIsNewUser(!singleUserRoleMapping);
    },
    handleDeleteMapping: async ({ roleMappingId }) => {
      const { http } = HttpLogic.values;
      const route = `/internal/workplace_search/org/role_mappings/${roleMappingId}`;

      try {
        await http.delete(route);
        actions.initializeRoleMappings();
        flashSuccessToast(ROLE_MAPPING_DELETED_MESSAGE);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    handleSaveMapping: async () => {
      const { http } = HttpLogic.values;
      const {
        attributeName,
        attributeValue,
        roleType,
        roleMapping,
        selectedGroups,
        includeInAllGroups,
      } = values;

      const body = JSON.stringify({
        roleType,
        allGroups: includeInAllGroups,
        rules: {
          [attributeName]: attributeValue,
        },
        groups: includeInAllGroups ? [] : Array.from(selectedGroups),
      });

      const request = !roleMapping
        ? http.post('/internal/workplace_search/org/role_mappings', { body })
        : http.put(`/internal/workplace_search/org/role_mappings/${roleMapping.id}`, { body });

      const SUCCESS_MESSAGE = !roleMapping
        ? ROLE_MAPPING_CREATED_MESSAGE
        : ROLE_MAPPING_UPDATED_MESSAGE;

      try {
        await request;
        actions.initializeRoleMappings();
        flashSuccessToast(SUCCESS_MESSAGE);
      } catch (e) {
        actions.setRoleMappingErrors(e?.body?.attributes?.errors);
      }
    },
    resetState: () => {
      clearFlashMessages();
    },
    handleSaveUser: async () => {
      const { http } = HttpLogic.values;
      const {
        roleType,
        singleUserRoleMapping,
        includeInAllGroups,
        selectedGroups,
        elasticsearchUser: { email, username },
      } = values;

      const body = JSON.stringify({
        roleMapping: {
          groups: includeInAllGroups ? [] : Array.from(selectedGroups),
          roleType,
          allGroups: includeInAllGroups,
          id: singleUserRoleMapping?.roleMapping?.id,
        },
        elasticsearchUser: {
          username,
          email,
        },
      });

      try {
        const response = await http.post<UserMapping>(
          '/internal/workplace_search/org/single_user_role_mapping',
          { body }
        );
        actions.setSingleUserRoleMapping(response);
        actions.setUserCreated();
        actions.initializeRoleMappings();
      } catch (e) {
        actions.setRoleMappingErrors(e?.body?.attributes?.errors);
      }
    },
    closeUsersAndRolesFlyout: () => {
      clearFlashMessages();
      const firstUser = values.elasticsearchUsers[0];
      actions.setElasticsearchUser(firstUser);
      actions.setDefaultGroup(values.availableGroups);
    },
    openRoleMappingFlyout: () => {
      clearFlashMessages();
    },
    openSingleUserRoleMappingFlyout: () => {
      clearFlashMessages();
    },
    setUserExistingRadioValue: ({ userFormUserIsExisting }) => {
      const firstUser = values.elasticsearchUsers[0];
      actions.setElasticsearchUser(userFormUserIsExisting ? firstUser : emptyUser);
    },
    handleUsernameSelectChange: ({ username }) => {
      const user = values.elasticsearchUsers.find((u) => u.username === username);
      if (user) actions.setElasticsearchUser(user);
    },
  }),
});
