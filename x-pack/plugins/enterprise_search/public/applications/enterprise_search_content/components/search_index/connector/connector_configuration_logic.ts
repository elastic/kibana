/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { ConnectorConfiguration, ConnectorStatus } from '../../../../../../common/types/connectors';
import { Actions } from '../../../../shared/api_logic/create_api_logic';

import {
  ConnectorConfigurationApiLogic,
  PostConnectorConfigurationArgs,
  PostConnectorConfigurationResponse,
} from '../../../api/connector/update_connector_configuration_api_logic';
import {
  CachedFetchIndexApiLogic,
  CachedFetchIndexApiLogicActions,
} from '../../../api/index/cached_fetch_index_api_logic';
import { FetchIndexApiResponse } from '../../../api/index/fetch_index_api_logic';
import { isConnectorIndex } from '../../../utils/indices';

type ConnectorConfigurationActions = Pick<
  Actions<PostConnectorConfigurationArgs, PostConnectorConfigurationResponse>,
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

interface ConfigEntry {
  key: string;
  label: string;
  value: string;
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
          configuration: values.localConfigState,
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
        setLocalConfigEntry: (configState, { key, label, value }) => ({
          ...configState,
          [key]: { label, value },
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
      (configState) =>
        Object.keys(configState)
          .map((key) => ({
            key,
            label: configState[key].label,
            value: configState[key].value,
          }))
          .sort((a, b) => a.key.localeCompare(b.key)),
    ],
    localConfigView: [
      () => [selectors.localConfigState],
      (configState) =>
        Object.keys(configState)
          .map((key) => ({
            key,
            label: configState[key].label,
            value: configState[key].value,
          }))
          .sort((a, b) => a.key.localeCompare(b.key)),
    ],
  }),
});
