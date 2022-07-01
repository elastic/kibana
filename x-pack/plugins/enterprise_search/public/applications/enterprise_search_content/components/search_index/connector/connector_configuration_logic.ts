/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Actions } from '../../../../shared/api_logic/create_api_logic';
import { clearFlashMessages, flashAPIErrors } from '../../../../shared/flash_messages';

import {
  ConnectorConfigurationApiLogic,
  PostConnectorConfigurationArgs,
  PostConnectorConfigurationResponse,
} from '../../../api/connector_package/update_connector_configuration_api_logic';
import { ConnectorConfiguration } from '../../../api/index/fetch_index_api_logic';

type ConnectorConfigurationActions = Pick<
  Actions<PostConnectorConfigurationArgs, PostConnectorConfigurationResponse>,
  'apiError' | 'apiSuccess' | 'makeRequest'
> & {
  setConfigState(configState: ConnectorConfiguration): {
    configState: ConnectorConfiguration;
  };
  setIsEditing(isEditing: boolean): { isEditing: boolean };
};

interface ConnectorConfigurationValues {
  configState: ConnectorConfiguration;
  isEditing: boolean;
}

interface ConnectorConfigurationProps {
  configuration: ConnectorConfiguration;
}

export const ConnectorConfigurationLogic = kea<
  MakeLogicType<
    ConnectorConfigurationValues,
    ConnectorConfigurationActions,
    ConnectorConfigurationProps
  >
>({
  actions: {
    setConfigState: (configState: ConnectorConfiguration) => ({ configState }),
    setIsEditing: (isEditing: boolean) => ({
      isEditing,
    }),
  },
  connect: {
    actions: [ConnectorConfigurationApiLogic, ['apiError', 'apiSuccess', 'makeRequest']],
  },
  listeners: {
    apiError: (error) => flashAPIErrors(error),
    makeRequest: () => clearFlashMessages(),
  },
  reducers: ({ props }) => ({
    configState: [
      props.configuration,
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
  }),
});
