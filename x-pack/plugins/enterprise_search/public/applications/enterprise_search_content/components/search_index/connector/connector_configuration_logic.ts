/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import {
  ConnectorConfiguration,
  ConnectorStatus,
  Dependency,
  DependencyLookup,
  DisplayType,
  SelectOption,
} from '../../../../../../common/types/connectors';
import { isNotNullish } from '../../../../../../common/utils/is_not_nullish';

import {
  ConnectorConfigurationApiLogic,
  PostConnectorConfigurationActions,
} from '../../../api/connector/update_connector_configuration_api_logic';
import {
  CachedFetchIndexApiLogic,
  CachedFetchIndexApiLogicActions,
} from '../../../api/index/cached_fetch_index_api_logic';
import { FetchIndexApiResponse } from '../../../api/index/fetch_index_api_logic';
import { isConnectorIndex } from '../../../utils/indices';

type ConnectorConfigurationActions = Pick<
  PostConnectorConfigurationActions,
  'apiSuccess' | 'makeRequest'
> & {
  fetchIndexApiSuccess: CachedFetchIndexApiLogicActions['apiSuccess'];
  saveConfig: () => void;
  setConfigState(configState: ConnectorConfiguration): {
    configState: ConnectorConfiguration;
  };
  setIsEditing(isEditing: boolean): { isEditing: boolean };
  setLocalConfigEntry(configEntry: ConfigEntry): ConfigEntry;
  setLocalConfigState(configState: ConnectorConfiguration): {
    configState: ConnectorConfiguration;
  };
  setShouldStartInEditMode(shouldStartInEditMode: boolean): { shouldStartInEditMode: boolean };
};

interface ConnectorConfigurationValues {
  configState: ConnectorConfiguration;
  configView: ConfigEntry[];
  index: FetchIndexApiResponse;
  isEditing: boolean;
  localConfigState: ConnectorConfiguration;
  localConfigView: ConfigEntry[];
  shouldStartInEditMode: boolean;
}

export interface ConfigEntry {
  default_value: string | number | boolean | null;
  depends_on: Dependency[];
  display: DisplayType;
  key: string;
  label: string;
  options: SelectOption[];
  order?: number;
  required: boolean;
  sensitive: boolean;
  tooltip: string;
  ui_restrictions: string[];
  value: string | number | boolean | null;
}

/**
 *
 * Sorts and filters the connector configuration
 *
 * Sorting is done by specified order (if present)
 * otherwise by alphabetic order of keys
 *
 * Filtering is done on any fields with ui_restrictions
 * or that have not had their dependencies met
 *
 */
function sortAndFilterConnectorConfiguration(config: ConnectorConfiguration): ConfigEntry[] {
  const sortedConfig = Object.keys(config)
    .map(
      (key) =>
        ({
          key,
          ...config[key],
        } as ConfigEntry)
    )
    .sort((a, b) => {
      if (isNotNullish(a.order)) {
        if (isNotNullish(b.order)) {
          return a.order - b.order;
        }
        return -1;
      }
      if (isNotNullish(b.order)) {
        // a doesn't have an order, but b has an order so takes precedence
        return 1;
      }
      return a.key.localeCompare(b.key);
    });

  const dependencyLookup: DependencyLookup = sortedConfig.reduce(
    (prev: Record<string, string | number | boolean | null>, configEntry: ConfigEntry) => ({
      ...prev,
      [configEntry.key]: configEntry.value,
    }),
    {}
  );

  return sortedConfig.filter(
    (configEntry) =>
      configEntry.ui_restrictions.length <= 0 &&
      dependenciesSatisfied(configEntry.depends_on, dependencyLookup)
  );
}

export function ensureStringType(value: string | number | boolean | null): string {
  return String(value);
}

export function ensureNumberType(value: string | number | boolean | null): number {
  const numberValue = Number(value);
  return isNaN(numberValue) ? 0 : numberValue;
}

export function ensureBooleanType(value: string | number | boolean | null): boolean {
  return Boolean(value);
}

export function dependenciesSatisfied(
  dependencies: Dependency[],
  dependencyLookup: DependencyLookup
): boolean {
  for (const dependency of dependencies) {
    if (dependency.value !== dependencyLookup[dependency.field]) {
      return false;
    }
  }

  return true;
}

export const ConnectorConfigurationLogic = kea<
  MakeLogicType<ConnectorConfigurationValues, ConnectorConfigurationActions>
>({
  actions: {
    saveConfig: true,
    setConfigState: (configState: ConnectorConfiguration) => ({ configState }),
    setIsEditing: (isEditing: boolean) => ({
      isEditing,
    }),
    setLocalConfigEntry: (configEntry: ConfigEntry) => ({ ...configEntry }),
    setLocalConfigState: (configState: ConnectorConfiguration) => ({ configState }),
    setShouldStartInEditMode: (shouldStartInEditMode: boolean) => ({ shouldStartInEditMode }),
  },
  connect: {
    actions: [
      ConnectorConfigurationApiLogic,
      ['apiSuccess', 'makeRequest'],
      CachedFetchIndexApiLogic,
      ['apiSuccess as fetchIndexApiSuccess'],
    ],
    values: [CachedFetchIndexApiLogic, ['indexData as index']],
  },
  events: ({ actions, values }) => ({
    afterMount: () => {
      actions.setConfigState(
        isConnectorIndex(values.index) ? values.index.connector.configuration : {}
      );
      if (
        isConnectorIndex(values.index) &&
        (values.index.connector.status === ConnectorStatus.CREATED ||
          values.index.connector.status === ConnectorStatus.NEEDS_CONFIGURATION)
      ) {
        // Only start in edit mode if we haven't configured yet
        // Necessary to prevent a race condition between saving config and getting updated connector
        actions.setShouldStartInEditMode(true);
      }
    },
  }),
  listeners: ({ actions, values }) => ({
    apiSuccess: ({ indexName }) => {
      CachedFetchIndexApiLogic.actions.makeRequest({ indexName });
    },
    fetchIndexApiSuccess: (index) => {
      if (!values.isEditing && isConnectorIndex(index)) {
        actions.setConfigState(index.connector.configuration);
      }

      if (
        !values.isEditing &&
        values.shouldStartInEditMode &&
        isConnectorIndex(index) &&
        index.connector.status === ConnectorStatus.NEEDS_CONFIGURATION &&
        index.connector.configuration &&
        Object.entries(index.connector.configuration).length > 0
      ) {
        actions.setIsEditing(true);
      }
    },
    saveConfig: () => {
      if (isConnectorIndex(values.index)) {
        actions.makeRequest({
          configuration: Object.keys(values.localConfigState)
            .map((key) =>
              values.localConfigState[key]
                ? { key, value: values.localConfigState[key]?.value ?? '' }
                : null
            )
            .filter(isNotNullish)
            .reduce(
              (prev: Record<string, string | number | boolean | null>, { key, value }) => ({
                ...prev,
                [key]: value,
              }),
              {}
            ),
          connectorId: values.index.connector.id,
          indexName: values.index.connector.index_name,
        });
      }
    },
    setIsEditing: (isEditing) => {
      if (isEditing) {
        actions.setLocalConfigState(values.configState);
      }
    },
  }),
  path: ['enterprise_search', 'content', 'connector_configuration'],
  reducers: () => ({
    configState: [
      {},
      {
        apiSuccess: (_, { configuration }) => configuration,
        setConfigState: (_, { configState }) => configState,
      },
    ],
    isEditing: [
      false,
      {
        apiSuccess: () => false,
        setIsEditing: (_, { isEditing }) => isEditing,
      },
    ],
    localConfigState: [
      {},
      {
        setLocalConfigEntry: (
          configState,
          {
            key,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            default_value,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            depends_on,
            display,
            label,
            options,
            order,
            required,
            sensitive,
            tooltip,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            ui_restrictions,
            value,
          }
        ) => ({
          ...configState,
          [key]: {
            default_value,
            depends_on,
            display,
            label,
            options,
            order,
            required,
            sensitive,
            tooltip,
            ui_restrictions,
            value,
          },
        }),
        setLocalConfigState: (_, { configState }) => configState,
      },
    ],
    shouldStartInEditMode: [
      false,
      {
        apiSuccess: () => false,
        setShouldStartInEditMode: (_, { shouldStartInEditMode }) => shouldStartInEditMode,
      },
    ],
  }),
  selectors: ({ selectors }) => ({
    configView: [
      () => [selectors.configState],
      (configState: ConnectorConfiguration) => sortAndFilterConnectorConfiguration(configState),
    ],
    localConfigView: [
      () => [selectors.localConfigState],
      (configState) => sortAndFilterConnectorConfiguration(configState),
    ],
  }),
});
