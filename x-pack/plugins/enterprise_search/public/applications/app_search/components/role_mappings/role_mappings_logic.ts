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
  attributes: string[];
  authProviders: string[];
  availableEngines: Engine[];
  elasticsearchRoles: string[];
  hasAdvancedRoles: boolean;
  multipleAuthProvidersConfig: boolean;
}

const getFirstAttributeName = (roleMapping: ASRoleMapping) =>
  Object.entries(roleMapping.rules)[0][0] as AttributeName;
const getFirstAttributeValue = (roleMapping: ASRoleMapping) =>
  Object.entries(roleMapping.rules)[0][1] as AttributeName;

interface RoleMappingsActions {
  handleAccessAllEnginesChange(selected: boolean): { selected: boolean };
  handleAuthProviderChange(value: string[]): { value: string[] };
  handleAttributeSelectorChange(
    value: AttributeName,
    firstElasticsearchRole: string
  ): { value: AttributeName; firstElasticsearchRole: string };
  handleAttributeValueChange(value: string): { value: string };
  handleDeleteMapping(roleMappingId: string): { roleMappingId: string };
  handleEngineSelectionChange(engineNames: string[]): { engineNames: string[] };
  handleRoleChange(roleType: RoleTypes): { roleType: RoleTypes };
  handleSaveMapping(): void;
  initializeRoleMapping(roleMappingId?: string): { roleMappingId?: string };
  initializeRoleMappings(): void;
  resetState(): void;
  setRoleMapping(roleMapping: ASRoleMapping): { roleMapping: ASRoleMapping };
  setRoleMappingsData(data: RoleMappingsServerDetails): RoleMappingsServerDetails;
  openRoleMappingFlyout(): void;
  closeRoleMappingFlyout(): void;
  setRoleMappingErrors(errors: string[]): { errors: string[] };
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
  selectedOptions: EuiComboBoxOptionOption[];
  roleMappingErrors: string[];
}

export const RoleMappingsLogic = kea<MakeLogicType<RoleMappingsValues, RoleMappingsActions>>({
  path: ['enterprise_search', 'app_search', 'role_mappings'],
  actions: {
    setRoleMappingsData: (data: RoleMappingsServerDetails) => data,
    setRoleMapping: (roleMapping: ASRoleMapping) => ({ roleMapping }),
    setRoleMappingErrors: (errors: string[]) => ({ errors }),
    handleAuthProviderChange: (value: string) => ({ value }),
    handleRoleChange: (roleType: RoleTypes) => ({ roleType }),
    handleEngineSelectionChange: (engineNames: string[]) => ({ engineNames }),
    handleAttributeSelectorChange: (value: string, firstElasticsearchRole: string) => ({
      value,
      firstElasticsearchRole,
    }),
    handleAttributeValueChange: (value: string) => ({ value }),
    handleAccessAllEnginesChange: (selected: boolean) => ({ selected }),
    resetState: true,
    initializeRoleMappings: true,
    initializeRoleMapping: (roleMappingId) => ({ roleMappingId }),
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
    roleMapping: [
      null,
      {
        setRoleMapping: (_, { roleMapping }) => roleMapping,
        resetState: () => null,
        closeRoleMappingFlyout: () => null,
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
    initializeRoleMapping: async ({ roleMappingId }) => {
      const roleMapping = values.roleMappings.find(({ id }) => id === roleMappingId);
      if (roleMapping) actions.setRoleMapping(roleMapping);
    },
    handleDeleteMapping: async ({ roleMappingId }) => {
      const { http } = HttpLogic.values;
      const route = `/api/app_search/role_mappings/${roleMappingId}`;

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
