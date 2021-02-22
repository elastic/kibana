/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import http from 'shared/http';
import { IFlashMessagesProps } from 'shared/types';
import routes from 'workplace_search/routes';

import { KibanaLogic } from '../../../shared/kibana';
import { ANY_AUTH_PROVIDER } from '../../../shared/role_mapping/constants';
import { ROLE_MAPPINGS_PATH } from '../../routes';

const DELETE_MESSAGE =
  'Are you sure you want to permanently delete this mapping? This action is not reversible and some users might lose access.';
const DEFAULT_GROUP_NAME = 'Default';

interface RoleMappingsServerDetails {
  flashMessages?: IFlashMessagesProps;
  multipleAuthProvidersConfig: boolean;
  roleMappings: WSRoleMapping[];
}

interface RoleMappingServerDetails {
  attributes: string[];
  authProviders: string[];
  availableGroups: RoleGroup[];
  elasticsearchRoles: string[];
  multipleAuthProvidersConfig: boolean;
  roleMapping: WSRoleMapping;
}

interface RoleMappingsActions {
  setRoleMappingsData(data: RoleMappingsServerDetails): RoleMappingsServerDetails;
  setRoleMappingData(data: RoleMappingServerDetails): RoleMappingServerDetails;
  setFlashMessages(flashMessages: IFlashMessagesProps): { flashMessages: IFlashMessagesProps };
  handleRoleChange(roleType: Role): { roleType: Role };
  handleAllGroupsSelectionChange(selected: boolean): { selected: boolean };
  handleAttributeSelectorChange(
    value: string,
    firstElasticsearchRole: string
  ): { value: string; firstElasticsearchRole: string };
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
  attributeName: string;
  dataLoading: boolean;
  multipleAuthProvidersConfig: boolean;
  flashMessages: IFlashMessagesProps;
  availableGroups: RoleGroup[];
  selectedGroups: Set<string>;
  includeInAllGroups: boolean;
  selectedAuthProviders: string[];
}

const getFirstAttributeName = (roleMapping: WSRoleMapping): string =>
  Object.entries(roleMapping.rules)[0][0] as string;
const getFirstAttributeValue = (roleMapping: WSRoleMapping): string =>
  Object.entries(roleMapping.rules)[0][1] as string;

export const RoleMappingsLogic = kea<MakeLogicType<RoleMappingsValues, RoleMappingsActions>>({
  actions: {
    setRoleMappingsData: (data: RoleMappingsServerDetails) => data,
    setRoleMappingData: (data: RoleMappingServerDetails) => data,
    setFlashMessages: (flashMessages: IFlashMessagesProps) => ({ flashMessages }),
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
    flashMessages: [
      {},
      {
        setRoleMappingsData: (_, { flashMessages }) => flashMessages || {},
        setFlashMessages: (_, { flashMessages }) => flashMessages,
        resetState: () => ({}),
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
    initializeRoleMappings: () => {
      http(routes.fritoPieOrganizationRoleMappingsPath())
        .then(({ data }) => actions.setRoleMappingsData(data))
        .catch(({ response }) => actions.setFlashMessages({ error: response.data.errors }));
    },
    initializeRoleMapping: ({ roleId }) => {
      const { navigateToUrl } = KibanaLogic.values;
      const url = roleId
        ? routes.fritoPieOrganizationRoleMappingPath(roleId)
        : routes.newFritoPieOrganizationRoleMappingPath();

      http(url)
        .then(({ data }) => actions.setRoleMappingData(data))
        .catch(({ response }) => {
          if (response.status === 404) {
            navigateToUrl(ROLE_MAPPINGS_PATH);
          }
          actions.setFlashMessages({ error: response.data.errors });
        });
    },
    handleDeleteMapping: () => {
      const { navigateToUrl } = KibanaLogic.values;
      const { roleMapping } = values;
      if (!roleMapping) {
        return;
      }
      if (window.confirm(DELETE_MESSAGE)) {
        http
          .delete(routes.fritoPieOrganizationRoleMappingPath(roleMapping.id))
          .then(() => {
            navigateToUrl(ROLE_MAPPINGS_PATH);
          })
          .catch(({ response }) => actions.setFlashMessages({ error: response.data.errors }));
      }
    },
    handleSaveMapping: () => {
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

      const payload = {
        rules: {
          [attributeName]: attributeValue,
        },
        roleType,
        groups: includeInAllGroups ? [] : Array.from(selectedGroups),
        allGroups: includeInAllGroups,
        authProvider: selectedAuthProviders,
      } as IObject;

      if (roleMapping) {
        payload.id = roleMapping.id;
      }

      const request = !roleMapping
        ? http.post(routes.fritoPieOrganizationRoleMappingsPath(), payload)
        : http.put(routes.fritoPieOrganizationRoleMappingPath(roleMapping.id), payload);

      request
        .then(() => {
          navigateToUrl(ROLE_MAPPINGS_PATH);
        })
        .catch(({ response }) => actions.setFlashMessages({ error: response.data.errors }));
    },
  }),
});
