/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { i18n } from '@kbn/i18n';

import {
  ConnectorConfiguration,
  ConnectorStatus,
  Dependency,
  DependencyLookup,
  DisplayType,
  FieldType,
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
  is_valid: boolean;
  key: string;
  label: string;
  options: SelectOption[];
  order?: number;
  required: boolean;
  sensitive: boolean;
  tooltip: string;
  type: FieldType;
  ui_restrictions: string[];
  validation_errors: string[];
  validations?: string[];
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
          is_valid: true,
          key,
          validation_errors: [],
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
      (configEntry.ui_restrictions ?? []).length <= 0 &&
      dependenciesSatisfied(configEntry.depends_on, dependencyLookup)
  );
}

function validateConnectorConfiguration(config: ConfigEntry[]): ConfigEntry[] {
  return config.map((configEntry) => {
    const label = configEntry.label;

    configEntry.validation_errors = [];

    if (configEntry.type === FieldType.INTEGER && !validIntInput(configEntry.value)) {
      configEntry.validation_errors.push(
        i18n.translate(
          'xpack.enterpriseSearch.content.indices.configurationConnector.config.invalidInteger',
          {
            defaultMessage: '{label} must be an integer.',
            values: { label },
          }
        )
      );
    }

    configEntry.is_valid = configEntry.validation_errors.length <= 0;

    return configEntry;
  });
}

function validIntInput(value: string | number | boolean | null): boolean {
  // reject non integers (including x.0 floats), but don't validate if empty
  return (value !== null || value !== '') &&
    (isNaN(Number(value)) ||
      !Number.isSafeInteger(Number(value)) ||
      ensureStringType(value).indexOf('.') >= 0)
    ? false
    : true;
}

function ensureCorrectTyping(
  type: FieldType,
  value: string | number | boolean | null
): string | number | boolean | null {
  switch (type) {
    case FieldType.INTEGER:
      return validIntInput(value) ? ensureIntType(value) : value;
    case FieldType.BOOLEAN:
      return ensureBooleanType(value);
    default:
      return ensureStringType(value);
  }
}

export function ensureStringType(value: string | number | boolean | null): string {
  return value !== null ? String(value) : '';
}

export function ensureIntType(value: string | number | boolean | null): number | null {
  // int is null-safe to prevent empty values from becoming zeroes
  if (value === null || value === '') {
    return null;
  }

  return parseInt(String(value), 10);
}

export function ensureBooleanType(value: string | number | boolean | null): boolean {
  return Boolean(value);
}

export function dependenciesSatisfied(
  dependencies: Dependency[],
  dependencyLookup: DependencyLookup
): boolean {
  if (!dependencies) {
    return true;
  }

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
            type,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            ui_restrictions,
            validations,
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
            type,
            ui_restrictions,
            validations: validations ?? [],
            value: display ? ensureCorrectTyping(type, value) : value, // only check type if field had a specified eui element
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
      (configState) => {
        const config = sortAndFilterConnectorConfiguration(configState);
        return validateConnectorConfiguration(config);
      },
    ],
  }),
});
