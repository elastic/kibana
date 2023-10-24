/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import {
  ConnectorConfigProperties,
  ConnectorConfiguration,
  ConnectorStatus,
} from '@kbn/search-connectors';

import { isCategoryEntry } from '../../../../../../common/connectors/is_category_entry';
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

import {
  ensureCorrectTyping,
  sortAndFilterConnectorConfiguration,
} from './utils/connector_configuration_utils';

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
  configView: ConfigView;
  index: FetchIndexApiResponse;
  isEditing: boolean;
  localConfigState: ConnectorConfiguration;
  localConfigView: ConfigView;
  shouldStartInEditMode: boolean;
}

interface ConfigEntry extends ConnectorConfigProperties {
  key: string;
}

export interface ConfigEntryView extends ConfigEntry {
  is_valid: boolean;
  validation_errors: string[];
}

export interface CategoryEntry {
  configEntries: ConfigEntryView[];
  key: string;
  label: string;
  order: number;
}

export interface ConfigView {
  advancedConfigurations: ConfigEntryView[];
  categories: CategoryEntry[];
  unCategorizedItems: ConfigEntryView[];
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
            .map((key) => {
              const entry = values.localConfigState[key];
              if (isCategoryEntry(entry) || !entry) {
                return null;
              }

              return { key, value: entry.value ?? '' };
            })
            .filter(isNotNullish)
            .reduce((prev: Record<string, string | number | boolean | null>, { key, value }) => {
              prev[key] = value;
              return prev;
            }, {}),
          connectorId: values.index.connector.id,
          indexName: values.index.connector.index_name ?? '',
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
          { key, display, type, validations, value, ...configEntry }
        ) => ({
          ...configState,
          [key]: {
            ...configEntry,
            display,
            type,
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
      () => [selectors.configState, selectors.index],
      (configState: ConnectorConfiguration, index: FetchIndexApiResponse) =>
        sortAndFilterConnectorConfiguration(
          configState,
          isConnectorIndex(index) ? index.connector.is_native : false
        ),
    ],
    localConfigView: [
      () => [selectors.localConfigState, selectors.index],
      (configState: ConnectorConfiguration, index: FetchIndexApiResponse) =>
        sortAndFilterConnectorConfiguration(
          configState,
          isConnectorIndex(index) ? index.connector.is_native : false
        ),
    ],
  }),
});
