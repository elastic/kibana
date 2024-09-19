/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Connector } from '@kbn/search-connectors';

import { HttpError, Status } from '../../../../../../common/types/api';

import { Actions } from '../../../../shared/api_logic/create_api_logic';
import {
  AddConnectorApiLogic,
  AddConnectorApiLogicActions,
} from '../../../api/connector/add_connector_api_logic';
import {
  GenerateConfigApiArgs,
  GenerateConfigApiLogic,
} from '../../../api/connector/generate_connector_config_api_logic';
import { APIKeyResponse } from '../../../api/generate_api_key/generate_api_key_logic';

type GenerateConfigApiActions = Actions<GenerateConfigApiArgs, {}>;

export interface CreateConnectorLogicValues {
  generateConfigurationError: HttpError;
  generateConfigurationStatus: Status;
  generatedConnectorName: string;
  generatedData: {
    apiKey: APIKeyResponse['apiKey'];
    connectorId: Connector['id'];
    indexName: string;
  };
  isGenerateLoading: boolean;
  newConnectorServiceType: Connector['service_type'];
}
export interface CreateConnectorLogicActions {
  createConnector: AddConnectorApiLogicActions['makeRequest'];
  generateConfiguration: GenerateConfigApiActions['makeRequest'];
  generateConfigurationSuccess: GenerateConfigApiActions['apiSuccess'];
  setNewConnectorServiceType: (serviceType: string) => { serviceType: string };
}

export const CreateConnectorLogic = kea<
  MakeLogicType<CreateConnectorLogicValues, CreateConnectorLogicActions>
>({
  actions: {
    createConnector: true,
    setNewConnectorServiceType: (serviceType: string) => ({ serviceType }),
  },
  connect: {
    actions: [
      GenerateConfigApiLogic,
      ['makeRequest as generateConfiguration', 'apiSuccess as generateConfigurationSuccess'],
      AddConnectorApiLogic,
      ['apiError', 'apiSuccess', 'makeRequest as createConnector', 'apiReset'],
    ],
    values: [
      GenerateConfigApiLogic,
      [
        'status as generateConfigurationStatus',
        'data as generatedData',
        'error as generateConfigurationError',
      ],
    ],
  },
  listeners: ({ actions }) => ({
    apiSuccess: async ({ id }) => {
      actions.generateConfiguration({ connectorId: id });
    },
  }),
  reducers: () => ({
    newConnectorServiceType: [
      '',
      {
        createConnector: () => '',
        setNewConnectorServiceType: (
          _: CreateConnectorLogicValues['newConnectorServiceType'],
          { serviceType }: { serviceType: string }
        ) => serviceType,
      },
    ],
  }),
  selectors: {
    isGenerateLoading: [
      (selectors) => [selectors.generateConfigurationStatus],
      (status) => status === Status.LOADING,
    ],
  },
});
