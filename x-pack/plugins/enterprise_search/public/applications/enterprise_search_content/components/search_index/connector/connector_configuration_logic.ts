/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { i18n } from '@kbn/i18n';

import { ConnectorConfiguration } from '../../../../../../common/types/connectors';
import { Actions } from '../../../../shared/api_logic/create_api_logic';
import {
  clearFlashMessages,
  flashAPIErrors,
  flashSuccessToast,
} from '../../../../shared/flash_messages';

import {
  ConnectorConfigurationApiLogic,
  PostConnectorConfigurationArgs,
  PostConnectorConfigurationResponse,
} from '../../../api/connector/update_connector_configuration_api_logic';
import { FetchIndexApiResponse } from '../../../api/index/fetch_index_api_logic';
import {
  FetchIndexApiWrapperLogic,
  FetchIndexApiWrapperLogicActions,
} from '../../../api/index/fetch_index_wrapper_logic';
import { isConnectorIndex } from '../../../utils/indices';

type ConnectorConfigurationActions = Pick<
  Actions<PostConnectorConfigurationArgs, PostConnectorConfigurationResponse>,
  'apiError' | 'apiSuccess' | 'makeRequest'
> & {
  fetchIndexApiSuccess: FetchIndexApiWrapperLogicActions['apiSuccess'];
  saveConfig: () => void;
  setConfigState(configState: ConnectorConfiguration): {
    configState: ConnectorConfiguration;
  };
  setIsEditing(isEditing: boolean): { isEditing: boolean };
  setLocalConfigEntry(configEntry: ConfigEntry): ConfigEntry;
  setLocalConfigState(configState: ConnectorConfiguration): {
    configState: ConnectorConfiguration;
  };
};

interface ConnectorConfigurationValues {
  configState: ConnectorConfiguration;
  configView: ConfigEntry[];
  index: FetchIndexApiResponse;
  isEditing: boolean;
  localConfigState: ConnectorConfiguration;
  localConfigView: ConfigEntry[];
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
  },
  connect: {
    actions: [
      ConnectorConfigurationApiLogic,
      ['apiError', 'apiSuccess', 'makeRequest'],
      FetchIndexApiWrapperLogic,
      ['apiSuccess as fetchIndexApiSuccess'],
    ],
    values: [FetchIndexApiWrapperLogic, ['indexData as index']],
  },
  events: ({ actions, values }) => ({
    afterMount: () =>
      actions.setConfigState(
        isConnectorIndex(values.index) ? values.index.connector.configuration : {}
      ),
  }),
  listeners: ({ actions, values }) => ({
    apiError: (error) => flashAPIErrors(error),
    apiSuccess: ({ indexName }) => {
      flashSuccessToast(
        i18n.translate(
          'xpack.enterpriseSearch.content.indices.configurationConnector.configuration.successToast.title',
          { defaultMessage: 'Configuration successfully updated' }
        )
      );
      FetchIndexApiWrapperLogic.actions.makeRequest({ indexName });
    },
    fetchIndexApiSuccess: (index) => {
      if (!values.isEditing && isConnectorIndex(index)) {
        actions.setConfigState(index.connector.configuration);
      }
    },
    makeRequest: () => clearFlashMessages(),
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
