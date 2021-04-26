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
  setSuccessMessage,
} from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import { KibanaLogic } from '../../../shared/kibana';
import { ANY_AUTH_PROVIDER } from '../../../shared/role_mapping/constants';
import { AttributeName } from '../../../shared/types';
import { ROLE_MAPPINGS_PATH } from '../../routes';
import { RoleGroup, WSRoleMapping, Role } from '../../types';

import {
  DELETE_ROLE_MAPPING_MESSAGE,
  ROLE_MAPPING_DELETED_MESSAGE,
  ROLE_MAPPING_CREATED_MESSAGE,
  ROLE_MAPPING_UPDATED_MESSAGE,
  DEFAULT_GROUP_NAME,
} from './constants';

interface RoleMappingsServerDetails {
  multipleAuthProvidersConfig: boolean;
  roleMappings: WSRoleMapping[];
}

interface RoleMappingServerDetails {
  attributes: string[];
  authProviders: string[];
  availableGroups: RoleGroup[];
  elasticsearchRoles: string[];
  multipleAuthProvidersConfig: boolean;
  roleMapping?: WSRoleMapping;
}

interface RoleMappingsActions {
  setRoleMappingsData(data: RoleMappingsServerDetails): RoleMappingsServerDetails;
  setRoleMappingData(data: RoleMappingServerDetails): RoleMappingServerDetails;
  handleRoleChange(roleType: Role): { roleType: Role };
  handleAllGroupsSelectionChange(selected: boolean): { selected: boolean };
  handleAttributeSelectorChange(
    value: AttributeName,
    firstElasticsearchRole: string
  ): { value: AttributeName; firstElasticsearchRole: string };
  handleAttributeValueChange(value: string): { value: string };
  handleGroupSelectionChange(
    groupId: string,
    selected: boolean
  ): { groupId: string; selected: boolean };
  handleAuthProviderChange(value: string[]): { value: string[] };
  resetState(): void;
  initializeRoleMapping(roleId?: string): { roleId?: string };
  handleSaveMapping(): void;
  handleDeleteMapping(): void;
  initializeRoleMappings(): void;
}

interface RoleMappingsValues {
  attributes: string[];
  availableAuthProviders: string[];
  elasticsearchRoles: string[];
  roleMapping: WSRoleMapping | null;
  roleMappings: WSRoleMapping[];
  roleType: Role;
  attributeValue: string;
  attributeName: AttributeName;
  dataLoading: boolean;
  multipleAuthProvidersConfig: boolean;
  availableGroups: RoleGroup[];
  selectedGroups: Set<string>;
  includeInAllGroups: boolean;
  selectedAuthProviders: string[];
}

const getFirstAttributeName = (roleMapping: WSRoleMapping): AttributeName =>
  Object.entries(roleMapping.rules)[0][0] as AttributeName;
const getFirstAttributeValue = (roleMapping: WSRoleMapping): string =>
  Object.entries(roleMapping.rules)[0][1] as string;

export const RoleMappingsLogic = kea<MakeLogicType<RoleMappingsValues, RoleMappingsActions>>({
  actions: {
    setRoleMappingsData: (data: RoleMappingsServerDetails) => data,
    setRoleMappingData: (data: RoleMappingServerDetails) => data,
    handleRoleChange: (roleType: Role) => ({ roleType }),
    handleGroupSelectionChange: (groupId: string, selected: boolean) => ({ groupId, selected }),
    handleAllGroupsSelectionChange: (selected: boolean) => ({ selected }),
    handleAttributeSelectorChange: (value: string, firstElasticsearchRole: string) => ({
      value,
      firstElasticsearchRole,
    }),
    handleAttributeValueChange: (value: string) => ({ value }),
    handleAuthProviderChange: (value: string[]) => ({ value }),
    resetState: () => true,
    initializeRoleMapping: (roleId?: string) => ({ roleId }),
    handleSaveMapping: () => true,
    handleDeleteMapping: () => true,
    initializeRoleMappings: () => true,
  },
  reducers: {
    dataLoading: [
      true,
      {
        setRoleMappingsData: () => false,
        setRoleMappingData: () => false,
        resetState: () => true,
      },
    ],
    roleMappings: [
      [],
      {
        setRoleMappingsData: (_, { roleMappings }) => roleMappings,
        resetState: () => [],
      },
    ],
    attributes: [
      [],
      {
        setRoleMappingData: (_, { attributes }) => attributes,
      },
    ],
    availableGroups: [
      [],
      {
        setRoleMappingData: (_, { availableGroups }) => availableGroups,
      },
    ],
    selectedGroups: [
      new Set(),
      {
        setRoleMappingData: (_, { roleMapping, availableGroups }) =>
          roleMapping
            ? new Set(roleMapping.groups.map((group) => group.id))
            : new Set(
                availableGroups
                  .filter((group) => group.name === DEFAULT_GROUP_NAME)
                  .map((group) => group.id)
              ),
        handleGroupSelectionChange: (groups, { groupId, selected }) => {
          const newSelectedGroupNames = new Set(groups as Set<string>);
          if (selected) {
            newSelectedGroupNames.add(groupId);
          } else {
            newSelectedGroupNames.delete(groupId);
          }
          return newSelectedGroupNames;
        },
      },
    ],
    includeInAllGroups: [
      false,
      {
        setRoleMappingData: (_, { roleMapping }) => (roleMapping ? roleMapping.allGroups : false),
        handleAllGroupsSelectionChange: (_, { selected }) => selected,
      },
    ],
    elasticsearchRoles: [
      [],
      {
        setRoleMappingData: (_, { elasticsearchRoles }) => elasticsearchRoles,
      },
    ],
    roleMapping: [
      null,
      {
        setRoleMappingData: (_, { roleMapping }) => roleMapping || null,
        resetState: () => null,
      },
    ],
    roleType: [
      'admin',
      {
        setRoleMappingData: (_, { roleMapping }) =>
          roleMapping ? (roleMapping.roleType as Role) : 'admin',
        handleRoleChange: (_, { roleType }) => roleType,
      },
    ],
    attributeValue: [
      '',
      {
        setRoleMappingData: (_, { roleMapping }) =>
          roleMapping ? getFirstAttributeValue(roleMapping) : '',
        handleAttributeSelectorChange: (_, { value, firstElasticsearchRole }) =>
          value === 'role' ? firstElasticsearchRole : '',
        handleAttributeValueChange: (_, { value }) => value,
        resetState: () => '',
      },
    ],
    attributeName: [
      'username',
      {
        setRoleMappingData: (_, { roleMapping }) =>
          roleMapping ? getFirstAttributeName(roleMapping) : 'username',
        handleAttributeSelectorChange: (_, { value }) => value,
        resetState: () => 'username',
      },
    ],
    availableAuthProviders: [
      [],
      {
        setRoleMappingData: (_, { authProviders }) => authProviders,
      },
    ],
    multipleAuthProvidersConfig: [
      false,
      {
        setRoleMappingsData: (_, { multipleAuthProvidersConfig }) => multipleAuthProvidersConfig,
        setRoleMappingData: (_, { multipleAuthProvidersConfig }) => multipleAuthProvidersConfig,
        resetState: () => false,
      },
    ],
    selectedAuthProviders: [
      [ANY_AUTH_PROVIDER],
      {
        handleAuthProviderChange: (previous, { value }) => {
          const previouslyContainedAny = previous.includes(ANY_AUTH_PROVIDER);
          const newSelectionsContainAny = value.includes(ANY_AUTH_PROVIDER);

          if (value.length < 1) return [ANY_AUTH_PROVIDER];
          if (value.length === 1) return value;
          if (!newSelectionsContainAny) return value;
          if (previouslyContainedAny) return value.filter((v) => v !== ANY_AUTH_PROVIDER);
          return [ANY_AUTH_PROVIDER];
        },
        setRoleMappingData: (_, { roleMapping }) =>
          roleMapping ? roleMapping.authProvider : [ANY_AUTH_PROVIDER],
      },
    ],
  },
  listeners: ({ actions, values }) => ({
    initializeRoleMappings: async () => {
      const { http } = HttpLogic.values;
      const route = '/api/workplace_search/org/role_mappings';

      try {
        const response = await http.get(route);
        actions.setRoleMappingsData(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    initializeRoleMapping: async ({ roleId }) => {
      const { http } = HttpLogic.values;
      const { navigateToUrl } = KibanaLogic.values;
      const route = roleId
        ? `/api/workplace_search/org/role_mappings/${roleId}`
        : '/api/workplace_search/org/role_mappings/new';

      try {
        const response = await http.get(route);
        actions.setRoleMappingData(response);
      } catch (e) {
        if (e.status === 404) {
          navigateToUrl(ROLE_MAPPINGS_PATH);
        }
        flashAPIErrors(e);
      }
    },
    handleDeleteMapping: async () => {
      const { http } = HttpLogic.values;
      const { navigateToUrl } = KibanaLogic.values;
      const { roleMapping } = values;
      if (!roleMapping) {
        return;
      }
      const route = `/api/workplace_search/org/role_mappings/${roleMapping.id}`;
      if (window.confirm(DELETE_ROLE_MAPPING_MESSAGE)) {
        try {
          await http.delete(route);
          navigateToUrl(ROLE_MAPPINGS_PATH);
          setSuccessMessage(ROLE_MAPPING_DELETED_MESSAGE);
        } catch (e) {
          flashAPIErrors(e);
        }
      }
    },
    handleSaveMapping: async () => {
      const { http } = HttpLogic.values;
      const { navigateToUrl } = KibanaLogic.values;
      const {
        attributeName,
        attributeValue,
        roleType,
        roleMapping,
        selectedGroups,
        includeInAllGroups,
        selectedAuthProviders,
      } = values;

      const body = JSON.stringify({
        rules: {
          [attributeName]: attributeValue,
        },
        roleType,
        groups: includeInAllGroups ? [] : Array.from(selectedGroups),
        allGroups: includeInAllGroups,
        authProvider: selectedAuthProviders,
      });

      const request = !roleMapping
        ? http.post('/api/workplace_search/org/role_mappings', { body })
        : http.put(`/api/workplace_search/org/role_mappings/${roleMapping.id}`, { body });

      const SUCCESS_MESSAGE = !roleMapping
        ? ROLE_MAPPING_CREATED_MESSAGE
        : ROLE_MAPPING_UPDATED_MESSAGE;

      try {
        await request;
        navigateToUrl(ROLE_MAPPINGS_PATH);
        setSuccessMessage(SUCCESS_MESSAGE);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    resetState: () => {
      clearFlashMessages();
    },
  }),
});
