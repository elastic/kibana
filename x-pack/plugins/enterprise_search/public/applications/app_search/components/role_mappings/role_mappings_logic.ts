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
import { ASRoleMapping, RoleTypes } from '../../types';
import { roleHasScopedEngines } from '../../utils/role/has_scoped_engines';
import { Engine } from '../engine/types';

import {
  ROLE_MAPPING_DELETED_MESSAGE,
  ROLE_MAPPING_CREATED_MESSAGE,
  ROLE_MAPPING_UPDATED_MESSAGE,
} from './constants';

type UserMapping = SingleUserRoleMapping<ASRoleMapping>;

interface RoleMappingsServerDetails extends RoleMappingsBaseServerDetails {
  roleMappings: ASRoleMapping[];
  availableEngines: Engine[];
  singleUserRoleMappings: UserMapping[];
  hasAdvancedRoles: boolean;
}

const getFirstAttributeName = (roleMapping: ASRoleMapping) =>
  Object.entries(roleMapping.rules)[0][0] as AttributeName;
const getFirstAttributeValue = (roleMapping: ASRoleMapping) =>
  Object.entries(roleMapping.rules)[0][1] as AttributeName;
const emptyUser = { username: '', email: '' } as ElasticsearchUser;

interface RoleMappingsActions extends RoleMappingsBaseActions {
  setRoleMapping(roleMapping: ASRoleMapping): { roleMapping: ASRoleMapping };
  setSingleUserRoleMapping(data?: UserMapping): { singleUserRoleMapping: UserMapping };
  setRoleMappings({ roleMappings }: { roleMappings: ASRoleMapping[] }): {
    roleMappings: ASRoleMapping[];
  };
  setRoleMappingsData(data: RoleMappingsServerDetails): RoleMappingsServerDetails;
  handleAccessAllEnginesChange(selected: boolean): { selected: boolean };
  handleEngineSelectionChange(engineNames: string[]): { engineNames: string[] };
  handleRoleChange(roleType: RoleTypes): { roleType: RoleTypes };
}

interface RoleMappingsValues extends RoleMappingsBaseValues {
  accessAllEngines: boolean;
  availableEngines: Engine[];
  roleMapping: ASRoleMapping | null;
  roleMappings: ASRoleMapping[];
  singleUserRoleMapping: UserMapping | null;
  singleUserRoleMappings: UserMapping[];
  roleType: RoleTypes;
  selectedEngines: Set<string>;
  hasAdvancedRoles: boolean;
}

export const RoleMappingsLogic = kea<MakeLogicType<RoleMappingsValues, RoleMappingsActions>>({
  path: ['enterprise_search', 'app_search', 'users_and_roles'],
  actions: {
    setRoleMappingsData: (data: RoleMappingsServerDetails) => data,
    setRoleMapping: (roleMapping: ASRoleMapping) => ({ roleMapping }),
    setElasticsearchUser: (elasticsearchUser: ElasticsearchUser) => ({ elasticsearchUser }),
    setSingleUserRoleMapping: (singleUserRoleMapping: UserMapping) => ({ singleUserRoleMapping }),
    setRoleMappings: ({ roleMappings }: { roleMappings: ASRoleMapping[] }) => ({ roleMappings }),
    setRoleMappingErrors: (errors: string[]) => ({ errors }),
    handleRoleChange: (roleType: RoleTypes) => ({ roleType }),
    handleUsernameSelectChange: (username: string) => ({ username }),
    handleEngineSelectionChange: (engineNames: string[]) => ({ engineNames }),
    handleAttributeSelectorChange: (value: string, firstElasticsearchRole: string) => ({
      value,
      firstElasticsearchRole,
    }),
    handleAttributeValueChange: (value: string) => ({ value }),
    handleAccessAllEnginesChange: (selected: boolean) => ({ selected }),
    enableRoleBasedAccess: true,
    openSingleUserRoleMappingFlyout: true,
    setUserExistingRadioValue: (userFormUserIsExisting: boolean) => ({ userFormUserIsExisting }),
    resetState: true,
    initializeRoleMappings: true,
    initializeSingleUserRoleMapping: (roleMappingId?: string) => ({ roleMappingId }),
    initializeRoleMapping: (roleMappingId) => ({ roleMappingId }),
    handleDeleteMapping: (roleMappingId: string) => ({ roleMappingId }),
    handleSaveMapping: true,
    handleSaveUser: true,
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
    hasAdvancedRoles: [
      false,
      {
        setRoleMappingsData: (_, { hasAdvancedRoles }) => hasAdvancedRoles,
      },
    ],
    availableEngines: [
      [],
      {
        setRoleMappingsData: (_, { availableEngines }) => availableEngines,
        resetState: () => [],
      },
    ],
    attributes: [
      [],
      {
        setRoleMappingsData: (_, { attributes }) => attributes,
        resetState: () => [],
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
        resetState: () => [],
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
    roleType: [
      'owner',
      {
        setRoleMapping: (_, { roleMapping }) => roleMapping.roleType as RoleTypes,
        handleRoleChange: (_, { roleType }) => roleType,
      },
    ],
    accessAllEngines: [
      true,
      {
        setRoleMapping: (_, { roleMapping }) => roleMapping.accessAllEngines,
        handleRoleChange: (_, { roleType }) => !roleHasScopedEngines(roleType),
        handleAccessAllEnginesChange: (_, { selected }) => selected,
        closeUsersAndRolesFlyout: () => true,
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
    selectedEngines: [
      new Set(),
      {
        setRoleMapping: (_, { roleMapping }) =>
          new Set(roleMapping.engines.map((engine: Engine) => engine.name)),
        handleAccessAllEnginesChange: () => new Set(),
        handleEngineSelectionChange: (_, { engineNames }) => {
          const newSelectedEngineNames = new Set() as Set<string>;
          engineNames.forEach((engineName) => newSelectedEngineNames.add(engineName));

          return newSelectedEngineNames;
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
    singleUserRoleMapping: [
      null,
      {
        setSingleUserRoleMapping: (_, { singleUserRoleMapping }) => singleUserRoleMapping || null,
        closeUsersAndRolesFlyout: () => null,
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
      () => [selectors.selectedEngines, selectors.availableEngines],
      (selectedEngines, availableEngines) => {
        const selectedNames = Array.from(selectedEngines.values());
        return availableEngines
          .filter(({ name }: { name: string }) => selectedNames.includes(name))
          .map(({ name }: { name: string }) => ({ label: name, value: name }));
      },
    ],
  }),
  listeners: ({ actions, values }) => ({
    enableRoleBasedAccess: async () => {
      const { http } = HttpLogic.values;
      const route = '/internal/app_search/role_mappings/enable_role_based_access';

      try {
        const response = await http.post<{ roleMappings: ASRoleMapping[] }>(route);
        actions.setRoleMappings(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    initializeRoleMappings: async () => {
      const { http } = HttpLogic.values;
      const route = '/internal/app_search/role_mappings';

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
      const route = `/internal/app_search/role_mappings/${roleMappingId}`;

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
        accessAllEngines,
        selectedEngines,
      } = values;

      const body = JSON.stringify({
        roleType,
        accessAllEngines,
        rules: {
          [attributeName]: attributeValue,
        },
        engines: accessAllEngines ? [] : Array.from(selectedEngines),
      });

      const request = !roleMapping
        ? http.post('/internal/app_search/role_mappings', { body })
        : http.put(`/internal/app_search/role_mappings/${roleMapping.id}`, { body });

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
        accessAllEngines,
        selectedEngines,
        elasticsearchUser: { email, username },
      } = values;

      const body = JSON.stringify({
        roleMapping: {
          engines: accessAllEngines ? [] : Array.from(selectedEngines),
          roleType,
          accessAllEngines,
          id: singleUserRoleMapping?.roleMapping?.id,
        },
        elasticsearchUser: {
          username,
          email,
        },
      });

      try {
        const response = await http.post<UserMapping | undefined>(
          '/internal/app_search/single_user_role_mapping',
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
