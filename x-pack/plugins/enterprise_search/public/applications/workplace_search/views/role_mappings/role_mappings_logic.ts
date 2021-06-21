/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { EuiComboBoxOptionOption } from '@elastic/eui';

import {
  clearFlashMessages,
  flashAPIErrors,
  setSuccessMessage,
} from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import { ANY_AUTH_PROVIDER } from '../../../shared/role_mapping/constants';
import { AttributeName } from '../../../shared/types';
import { RoleGroup, WSRoleMapping, Role } from '../../types';

import {
  DELETE_ROLE_MAPPING_MESSAGE,
  ROLE_MAPPING_DELETED_MESSAGE,
  ROLE_MAPPING_CREATED_MESSAGE,
  ROLE_MAPPING_UPDATED_MESSAGE,
  DEFAULT_GROUP_NAME,
} from './constants';

interface RoleMappingsServerDetails {
  roleMappings: WSRoleMapping[];
  attributes: string[];
  authProviders: string[];
  availableGroups: RoleGroup[];
  elasticsearchRoles: string[];
  multipleAuthProvidersConfig: boolean;
}

const getFirstAttributeName = (roleMapping: WSRoleMapping): AttributeName =>
  Object.entries(roleMapping.rules)[0][0] as AttributeName;
const getFirstAttributeValue = (roleMapping: WSRoleMapping): string =>
  Object.entries(roleMapping.rules)[0][1] as string;

interface RoleMappingsActions {
  handleAllGroupsSelectionChange(selected: boolean): { selected: boolean };
  handleAuthProviderChange(value: string[]): { value: string[] };
  handleAttributeSelectorChange(
    value: AttributeName,
    firstElasticsearchRole: string
  ): { value: AttributeName; firstElasticsearchRole: string };
  handleAttributeValueChange(value: string): { value: string };
  handleDeleteMapping(roleMappingId: string): { roleMappingId: string };
  handleGroupSelectionChange(groupIds: string[]): { groupIds: string[] };
  handleRoleChange(roleType: Role): { roleType: Role };
  handleSaveMapping(): void;
  initializeRoleMapping(roleMappingId?: string): { roleMappingId?: string };
  initializeRoleMappings(): void;
  resetState(): void;
  setRoleMapping(roleMapping: WSRoleMapping): { roleMapping: WSRoleMapping };
  setRoleMappingsData(data: RoleMappingsServerDetails): RoleMappingsServerDetails;
  openRoleMappingFlyout(): void;
  closeRoleMappingFlyout(): void;
  setRoleMappingErrors(errors: string[]): { errors: string[] };
}

interface RoleMappingsValues {
  includeInAllGroups: boolean;
  attributeName: AttributeName;
  attributeValue: string;
  attributes: string[];
  availableAuthProviders: string[];
  availableGroups: RoleGroup[];
  dataLoading: boolean;
  elasticsearchRoles: string[];
  multipleAuthProvidersConfig: boolean;
  roleMapping: WSRoleMapping | null;
  roleMappings: WSRoleMapping[];
  roleType: Role;
  selectedAuthProviders: string[];
  selectedGroups: Set<string>;
  roleMappingFlyoutOpen: boolean;
  selectedOptions: EuiComboBoxOptionOption[];
  roleMappingErrors: string[];
}

export const RoleMappingsLogic = kea<MakeLogicType<RoleMappingsValues, RoleMappingsActions>>({
  path: ['enterprise_search', 'workplace_search', 'role_mappings'],
  actions: {
    setRoleMappingsData: (data: RoleMappingsServerDetails) => data,
    setRoleMapping: (roleMapping: WSRoleMapping) => ({ roleMapping }),
    setRoleMappingErrors: (errors: string[]) => ({ errors }),
    handleAuthProviderChange: (value: string[]) => ({ value }),
    handleRoleChange: (roleType: Role) => ({ roleType }),
    handleGroupSelectionChange: (groupIds: string[]) => ({ groupIds }),
    handleAttributeSelectorChange: (value: string, firstElasticsearchRole: string) => ({
      value,
      firstElasticsearchRole,
    }),
    handleAttributeValueChange: (value: string) => ({ value }),
    handleAllGroupsSelectionChange: (selected: boolean) => ({ selected }),
    resetState: true,
    initializeRoleMappings: true,
    initializeRoleMapping: (roleMappingId?: string) => ({ roleMappingId }),
    handleDeleteMapping: (roleMappingId: string) => ({ roleMappingId }),
    handleSaveMapping: true,
    openRoleMappingFlyout: true,
    closeRoleMappingFlyout: false,
  },
  reducers: {
    dataLoading: [
      true,
      {
        setRoleMappingsData: () => false,
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
    multipleAuthProvidersConfig: [
      false,
      {
        setRoleMappingsData: (_, { multipleAuthProvidersConfig }) => multipleAuthProvidersConfig,
        resetState: () => false,
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
    roleMapping: [
      null,
      {
        setRoleMapping: (_, { roleMapping }) => roleMapping,
        resetState: () => null,
        closeRoleMappingFlyout: () => null,
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
        closeRoleMappingFlyout: () => '',
      },
    ],
    attributeName: [
      'username',
      {
        setRoleMapping: (_, { roleMapping }) => getFirstAttributeName(roleMapping),
        handleAttributeSelectorChange: (_, { value }) => value,
        resetState: () => 'username',
        closeRoleMappingFlyout: () => 'username',
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
        setRoleMapping: (_, { roleMapping }) =>
          new Set(roleMapping.groups.map((group: RoleGroup) => group.id)),
        handleGroupSelectionChange: (_, { groupIds }) => {
          const newSelectedGroupNames = new Set() as Set<string>;
          groupIds.forEach((groupId) => newSelectedGroupNames.add(groupId));

          return newSelectedGroupNames;
        },
      },
    ],
    availableAuthProviders: [
      [],
      {
        setRoleMappingsData: (_, { authProviders }) => authProviders,
      },
    ],
    selectedAuthProviders: [
      [ANY_AUTH_PROVIDER],
      {
        handleAuthProviderChange: (previous, { value }) => {
          const previouslyContainedAny = previous.includes(ANY_AUTH_PROVIDER);
          const newSelectionsContainAny = value.includes(ANY_AUTH_PROVIDER);
          const hasItems = value.length > 0;

          if (value.length === 1) return value;
          if (!newSelectionsContainAny && hasItems) return value;
          if (previouslyContainedAny && hasItems)
            return value.filter((v) => v !== ANY_AUTH_PROVIDER);
          return [ANY_AUTH_PROVIDER];
        },
        setRoleMapping: (_, { roleMapping }) => roleMapping.authProvider,
      },
    ],
    roleMappingFlyoutOpen: [
      false,
      {
        openRoleMappingFlyout: () => true,
        closeRoleMappingFlyout: () => false,
        initializeRoleMappings: () => false,
        initializeRoleMapping: () => true,
      },
    ],
    roleMappingErrors: [
      [],
      {
        setRoleMappingErrors: (_, { errors }) => errors,
        handleSaveMapping: () => [],
        closeRoleMappingFlyout: () => [],
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
    initializeRoleMapping: async ({ roleMappingId }) => {
      const roleMapping = values.roleMappings.find(({ id }) => id === roleMappingId);
      if (roleMapping) actions.setRoleMapping(roleMapping);
    },
    handleDeleteMapping: async ({ roleMappingId }) => {
      const { http } = HttpLogic.values;
      const route = `/api/workplace_search/org/role_mappings/${roleMappingId}`;

      if (window.confirm(DELETE_ROLE_MAPPING_MESSAGE)) {
        try {
          await http.delete(route);
          actions.initializeRoleMappings();
          setSuccessMessage(ROLE_MAPPING_DELETED_MESSAGE);
        } catch (e) {
          flashAPIErrors(e);
        }
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
        selectedAuthProviders,
      } = values;

      const body = JSON.stringify({
        roleType,
        allGroups: includeInAllGroups,
        authProvider: selectedAuthProviders,
        rules: {
          [attributeName]: attributeValue,
        },
        groups: includeInAllGroups ? [] : Array.from(selectedGroups),
      });

      const request = !roleMapping
        ? http.post('/api/workplace_search/org/role_mappings', { body })
        : http.put(`/api/workplace_search/org/role_mappings/${roleMapping.id}`, { body });

      const SUCCESS_MESSAGE = !roleMapping
        ? ROLE_MAPPING_CREATED_MESSAGE
        : ROLE_MAPPING_UPDATED_MESSAGE;

      try {
        await request;
        actions.initializeRoleMappings();
        setSuccessMessage(SUCCESS_MESSAGE);
      } catch (e) {
        actions.setRoleMappingErrors(e?.body?.attributes?.errors);
      }
    },
    resetState: () => {
      clearFlashMessages();
    },
    closeRoleMappingFlyout: () => {
      clearFlashMessages();
    },
    openRoleMappingFlyout: () => {
      clearFlashMessages();
    },
  }),
});
