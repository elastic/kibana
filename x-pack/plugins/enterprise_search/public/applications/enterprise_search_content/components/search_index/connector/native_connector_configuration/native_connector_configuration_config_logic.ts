/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { ConnectorConfiguration } from '../../../../../../../common/types/connectors';

import { Actions } from '../../../../../shared/api_logic/create_api_logic';
import {
  clearFlashMessages,
  flashAPIErrors,
  flashSuccessToast,
} from '../../../../../shared/flash_messages';

import {
  ConnectorConfigurationApiLogic,
  PostConnectorConfigurationArgs,
  PostConnectorConfigurationResponse,
} from '../../../../api/connector/update_connector_configuration_api_logic';
import {
  FetchIndexApiLogic,
  FetchIndexApiResponse,
} from '../../../../api/index/fetch_index_api_logic';
import { isConnectorIndex } from '../../../../utils/indices';

type NativeConnectorConfigurationConfigActions = Pick<
  Actions<PostConnectorConfigurationArgs, PostConnectorConfigurationResponse>,
  'apiError' | 'apiSuccess' | 'makeRequest'
> & {
  saveConfiguration(): void;
  setConfiguration(configuration: ConnectorConfiguration): {
    configuration: ConnectorConfiguration;
  };
};

interface NativeConnectorConfigurationConfigValues {
  configuration: ConnectorConfiguration;
  index: FetchIndexApiResponse;
  isEditing: boolean;
}

export const NativeConnectorConfigurationConfigLogic = kea<
  MakeLogicType<NativeConnectorConfigurationConfigValues, NativeConnectorConfigurationConfigActions>
>({
  actions: {
    saveConfiguration: true,
    setConfiguration: (configuration) => ({ configuration }),
  },
  connect: {
    actions: [ConnectorConfigurationApiLogic, ['apiError', 'apiSuccess', 'makeRequest']],
    values: [FetchIndexApiLogic, ['data as index']],
  },
  listeners: ({ actions, values }) => ({
    apiError: (error) => flashAPIErrors(error),
    apiSuccess: () => {
      FetchIndexApiLogic.actions.makeRequest({ indexName: values.index.name });
      flashSuccessToast('Your configuration changes have been saved.');
    },
    makeRequest: () => clearFlashMessages(),
    saveConfiguration: () => {
      if (isConnectorIndex(values.index)) {
        actions.makeRequest({
          configuration: values.configuration,
          connectorId: values.index.connector.id,
          indexName: values.index.name,
        });
      }
    },
  }),
  path: ['enterprise_search', 'content', 'native_connector_configuration_config'],
  reducers: () => ({
    configuration: [
      {},
      {
        setConfiguration: (_, { configuration }) => configuration,
      },
    ],
    isEditing: [
      false,
      {
        setConfiguration: () => true,
        apiSuccess: () => false,
      },
    ],
  }),
});
