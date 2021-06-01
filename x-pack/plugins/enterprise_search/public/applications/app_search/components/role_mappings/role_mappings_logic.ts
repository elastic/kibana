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
  setErrorMessage,
} from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import { ANY_AUTH_PROVIDER, ROLE_MAPPING_NOT_FOUND } from '../../../shared/role_mapping/constants';
import { AttributeName } from '../../../shared/types';
import { ASRoleMapping, RoleTypes } from '../../types';
import { roleHasScopedEngines } from '../../utils/role/has_scoped_engines';
import { Engine } from '../engine/types';

import {
  DELETE_ROLE_MAPPING_MESSAGE,
  ROLE_MAPPING_DELETED_MESSAGE,
  ROLE_MAPPING_CREATED_MESSAGE,
  ROLE_MAPPING_UPDATED_MESSAGE,
} from './constants';

interface RoleMappingsServerDetails {
  roleMappings: ASRoleMapping[];
  multipleAuthProvidersConfig: boolean;
}

interface RoleMappingServerDetails {
  attributes: string[];
  authProviders: string[];
  availableEngines: Engine[];
  elasticsearchRoles: string[];
  hasAdvancedRoles: boolean;
  multipleAuthProvidersConfig: boolean;
  roleMapping?: ASRoleMapping;
}

const getFirstAttributeName = (roleMapping: ASRoleMapping) =>
  Object.entries(roleMapping.rules)[0][0] as AttributeName;
const getFirstAttributeValue = (roleMapping: ASRoleMapping) =>
  Object.entries(roleMapping.rules)[0][1] as AttributeName;

interface RoleMappingsActions {
  handleAccessAllEnginesChange(): void;
  handleAuthProviderChange(value: string[]): { value: string[] };
  handleAttributeSelectorChange(
    value: AttributeName,
    firstElasticsearchRole: string
  ): { value: AttributeName; firstElasticsearchRole: string };
  handleAttributeValueChange(value: string): { value: string };
  handleDeleteMapping(): void;
  handleEngineSelectionChange(
    engineName: string,
    selected: boolean
  ): {
    engineName: string;
    selected: boolean;
  };
  handleRoleChange(roleType: RoleTypes): { roleType: RoleTypes };
  handleSaveMapping(): void;
  initializeRoleMapping(roleId?: string): { roleId?: string };
  initializeRoleMappings(): void;
  resetState(): void;
  setRoleMappingData(data: RoleMappingServerDetails): RoleMappingServerDetails;
  setRoleMappingsData(data: RoleMappingsServerDetails): RoleMappingsServerDetails;
  openRoleMappingFlyout(): void;
  closeRoleMappingFlyout(): void;
}

interface RoleMappingsValues {
  accessAllEngines: boolean;
  attributeName: AttributeName;
  attributeValue: string;
  attributes: string[];
  availableAuthProviders: string[];
  availableEngines: Engine[];
  dataLoading: boolean;
  elasticsearchRoles: string[];
  hasAdvancedRoles: boolean;
  multipleAuthProvidersConfig: boolean;
  roleMapping: ASRoleMapping | null;
  roleMappings: ASRoleMapping[];
  roleType: RoleTypes;
  selectedAuthProviders: string[];
  selectedEngines: Set<string>;
  roleMappingFlyoutOpen: boolean;
}

export const RoleMappingsLogic = kea<MakeLogicType<RoleMappingsValues, RoleMappingsActions>>({
  path: ['enterprise_search', 'app_search', 'role_mappings'],
  actions: {
    setRoleMappingsData: (data: RoleMappingsServerDetails) => data,
    setRoleMappingData: (data: RoleMappingServerDetails) => data,
    handleAuthProviderChange: (value: string) => ({ value }),
    handleRoleChange: (roleType: RoleTypes) => ({ roleType }),
    handleEngineSelectionChange: (engineName: string, selected: boolean) => ({
      engineName,
      selected,
    }),
    handleAttributeSelectorChange: (value: string, firstElasticsearchRole: string) => ({
      value,
      firstElasticsearchRole,
    }),
    handleAttributeValueChange: (value: string) => ({ value }),
    handleAccessAllEnginesChange: true,
    resetState: true,
    initializeRoleMappings: true,
    initializeRoleMapping: (roleId) => ({ roleId }),
    handleDeleteMapping: true,
    handleSaveMapping: true,
    openRoleMappingFlyout: true,
    closeRoleMappingFlyout: false,
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
    multipleAuthProvidersConfig: [
      false,
      {
        setRoleMappingsData: (_, { multipleAuthProvidersConfig }) => multipleAuthProvidersConfig,
        setRoleMappingData: (_, { multipleAuthProvidersConfig }) => multipleAuthProvidersConfig,
        resetState: () => false,
      },
    ],
    hasAdvancedRoles: [
      false,
      {
        setRoleMappingData: (_, { hasAdvancedRoles }) => hasAdvancedRoles,
      },
    ],
    availableEngines: [
      [],
      {
        setRoleMappingData: (_, { availableEngines }) => availableEngines,
        resetState: () => [],
      },
    ],
    attributes: [
      [],
      {
        setRoleMappingData: (_, { attributes }) => attributes,
        resetState: () => [],
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
        closeRoleMappingFlyout: () => null,
      },
    ],
    roleType: [
      'owner',
      {
        setRoleMappingData: (_, { roleMapping }) =>
          roleMapping ? (roleMapping.roleType as RoleTypes) : 'owner',
        handleRoleChange: (_, { roleType }) => roleType,
      },
    ],
    accessAllEngines: [
      true,
      {
        setRoleMappingData: (_, { roleMapping }) =>
          roleMapping ? roleMapping.accessAllEngines : true,
        handleRoleChange: (_, { roleType }) => !roleHasScopedEngines(roleType),
        handleAccessAllEnginesChange: (accessAllEngines) => !accessAllEngines,
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
        closeRoleMappingFlyout: () => '',
      },
    ],
    attributeName: [
      'username',
      {
        setRoleMappingData: (_, { roleMapping }) =>
          roleMapping ? getFirstAttributeName(roleMapping) : 'username',
        handleAttributeSelectorChange: (_, { value }) => value,
        resetState: () => 'username',
        closeRoleMappingFlyout: () => 'username',
      },
    ],
    selectedEngines: [
      new Set(),
      {
        setRoleMappingData: (_, { roleMapping }) =>
          roleMapping ? new Set(roleMapping.engines.map((engine) => engine.name)) : new Set(),
        handleAccessAllEnginesChange: () => new Set(),
        handleEngineSelectionChange: (engines, { engineName, selected }) => {
          const newSelectedEngineNames = new Set(engines as Set<string>);
          if (selected) {
            newSelectedEngineNames.add(engineName);
          } else {
            newSelectedEngineNames.delete(engineName);
          }

          return newSelectedEngineNames;
        },
      },
    ],
    availableAuthProviders: [
      [],
      {
        setRoleMappingData: (_, { authProviders }) => authProviders,
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
        setRoleMappingData: (_, { roleMapping }) =>
          roleMapping ? roleMapping.authProvider : [ANY_AUTH_PROVIDER],
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
  },
  listeners: ({ actions, values }) => ({
    initializeRoleMappings: async () => {
      const { http } = HttpLogic.values;
      const route = '/api/app_search/role_mappings';

      try {
        const response = await http.get(route);
        actions.setRoleMappingsData(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    initializeRoleMapping: async ({ roleId }) => {
      const { http } = HttpLogic.values;
      const route = roleId
        ? `/api/app_search/role_mappings/${roleId}`
        : '/api/app_search/role_mappings/new';

      try {
        const response = await http.get(route);
        actions.setRoleMappingData(response);
      } catch (e) {
        if (e.status === 404) {
          setErrorMessage(ROLE_MAPPING_NOT_FOUND);
        } else {
          flashAPIErrors(e);
        }
      }
    },
    handleDeleteMapping: async () => {
      const { roleMapping } = values;
      if (!roleMapping) return;

      const { http } = HttpLogic.values;
      const route = `/api/app_search/role_mappings/${roleMapping.id}`;

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
        accessAllEngines,
        selectedEngines,
        selectedAuthProviders: authProvider,
      } = values;

      const body = JSON.stringify({
        roleType,
        accessAllEngines,
        authProvider,
        rules: {
          [attributeName]: attributeValue,
        },
        engines: accessAllEngines ? [] : Array.from(selectedEngines),
      });

      const request = !roleMapping
        ? http.post('/api/app_search/role_mappings', { body })
        : http.put(`/api/app_search/role_mappings/${roleMapping.id}`, { body });

      const SUCCESS_MESSAGE = !roleMapping
        ? ROLE_MAPPING_CREATED_MESSAGE
        : ROLE_MAPPING_UPDATED_MESSAGE;

      try {
        await request;
        actions.initializeRoleMappings();
        setSuccessMessage(SUCCESS_MESSAGE);
      } catch (e) {
        flashAPIErrors(e);
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
