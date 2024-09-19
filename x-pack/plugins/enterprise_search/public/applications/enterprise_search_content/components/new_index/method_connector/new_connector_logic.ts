/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Connector } from '@kbn/search-connectors';
import { ConnectorDefinition } from '@kbn/search-connectors-plugin/public';

import { Actions } from '../../../../shared/api_logic/create_api_logic';
import {
  AddConnectorApiLogic,
  AddConnectorApiLogicActions,
  AddConnectorApiLogicArgs,
  AddConnectorApiLogicResponse,
} from '../../../api/connector/add_connector_api_logic';

import {
  GenerateConfigApiActions,
  GenerateConfigApiLogic,
} from '../../../api/connector/generate_connector_config_api_logic';
import {
  GenerateConnectorNamesApiLogic,
  GenerateConnectorNamesApiLogicActions,
  GenerateConnectorNamesApiResponse,
} from '../../../api/connector/generate_connector_names_api_logic';
import { APIKeyResponse } from '../../../api/generate_api_key/generate_api_key_logic';
import {
  IndexExistsApiLogic,
  IndexExistsApiParams,
  IndexExistsApiResponse,
} from '../../../api/index/index_exists_api_logic';

import { isValidIndexName } from '../../../utils/validate_index_name';

import {
  ConnectorViewActions,
  ConnectorViewLogic,
} from '../../connector_detail/connector_view_logic';
import { UNIVERSAL_LANGUAGE_VALUE } from '../constants';
import { LanguageForOptimization } from '../types';
import { getLanguageForOptimization } from '../utils';

export interface NewConnectorValues {
  canConfigureConnector: boolean;
  connectorId: string;
  data: IndexExistsApiResponse;
  fullIndexName: string;
  fullIndexNameExists: boolean;
  fullIndexNameIsValid: boolean;
  generatedConfigData:
    | {
        apiKey: APIKeyResponse['apiKey'];
        connectorId: Connector['id'];
        indexName: string;
      }
    | undefined;
  generatedNameData: GenerateConnectorNamesApiResponse | undefined;
  language: LanguageForOptimization;
  languageSelectValue: string;
  rawName: string;
  selectedConnector: ConnectorDefinition | null;
}

type NewConnectorActions = Pick<
  Actions<IndexExistsApiParams, IndexExistsApiResponse>,
  'makeRequest'
> & {
  conncetorNameGenerated: GenerateConnectorNamesApiLogicActions['apiSuccess'];
  generateConnectorName: GenerateConnectorNamesApiLogicActions['makeRequest'];
} & {
  configurationGenerated: GenerateConfigApiActions['apiSuccess'];
  generateConfiguration: GenerateConfigApiActions['makeRequest'];
} & {
  connectorCreated: Actions<AddConnectorApiLogicArgs, AddConnectorApiLogicResponse>['apiSuccess'];
  createConnector: ({ isSelfManaged }: { isSelfManaged: boolean }) => { isSelfManaged: boolean };
  createConnectorApi: AddConnectorApiLogicActions['makeRequest'];
  fetchConnector: ConnectorViewActions['fetchConnector'];
  setLanguageSelectValue(language: string): { language: string };
  setRawName(rawName: string): { rawName: string };
  setSelectedConnector(connector: ConnectorDefinition | null): {
    connector: ConnectorDefinition | null;
  };
};

export const NewConnectorLogic = kea<MakeLogicType<NewConnectorValues, NewConnectorActions>>({
  actions: {
    createConnector: ({ isSelfManaged }) => ({ isSelfManaged }),
    setLanguageSelectValue: (language) => ({ language }),
    setRawName: (rawName) => ({ rawName }),
    setSelectedConnector: (connector) => ({ connector }),
  },
  connect: {
    actions: [
      GenerateConnectorNamesApiLogic,
      ['makeRequest as generateConnectorName', 'apiSuccess as connectorNameGenerated'],
      AddConnectorApiLogic,
      ['makeRequest as createConnectorApi', 'apiSuccess as connectorCreated'],
      IndexExistsApiLogic,
      ['makeRequest'],
      GenerateConfigApiLogic,
      ['makeRequest as generateConfiguration', 'apiSuccess as configurationGenerated'],
      ConnectorViewLogic,
      ['fetchConnector'],
    ],
    values: [
      IndexExistsApiLogic,
      ['data'],
      GenerateConnectorNamesApiLogic,
      ['data as generatedNameData'],
      GenerateConfigApiLogic,
      ['data as generatedConfigData'],
    ],
  },
  listeners: ({ actions, values }) => ({
    connectorNameGenerated: ({ connectorName }) => {
      // actions.setGeneratedName(connectorName);
    },
    connectorCreated: ({ id }) => {
      actions.fetchConnector({ connectorId: id });
      actions.generateConfiguration({ connectorId: id });
    },
    createConnector: ({ isSelfManaged }) => {
      if (
        !values.rawName &&
        values.selectedConnector &&
        values.fullIndexName &&
        values.generatedNameData
      ) {
        // name is generated, use everything generated
        actions.createConnectorApi({
          deleteExistingConnector: false,
          indexName: values.fullIndexName,
          isNative: !values.selectedConnector.isNative ? false : isSelfManaged,
          language: null,
          name: values.generatedNameData.connectorName,
          serviceType: values.selectedConnector.serviceType,
        });
      } else {
        // TODO: this is the user input case. Generate index and api key names from the user input first and then create the connector.
        // Other option is to change the endpoint to do this in API level
      }
    },
    setSelectedConnector: ({ connector }) => {
      if (values.rawName === '' && connector) {
        actions.generateConnectorName({ connectorType: connector.serviceType });
      }
    },
  }),
  path: ['enterprise_search', 'content', 'new_search_index'],
  reducers: {
    connectorId: [
      '',
      {
        connectorCreated: (
          _: NewConnectorValues['connectorId'],
          { id }: { id: NewConnectorValues['connectorId'] }
        ) => id,
      },
    ],
    languageSelectValue: [
      UNIVERSAL_LANGUAGE_VALUE,
      {
        // @ts-expect-error upgrade typescript v5.1.6
        setLanguageSelectValue: (_, { language }) => language ?? null,
      },
    ],
    rawName: [
      '',
      {
        // @ts-expect-error upgrade typescript v5.1.6
        setRawName: (_, { rawName }) => rawName,
      },
    ],
    selectedConnector: [
      null,
      {
        setSelectedConnector: (
          _: NewConnectorValues['selectedConnector'],
          { connector }: { connector: NewConnectorValues['selectedConnector'] }
        ) => connector,
      },
    ],
  },
  selectors: ({ selectors }) => ({
    canConfigureConnector: [
      () => [selectors.fullIndexName, selectors.selectedConnector],
      (fullIndexName: string, selectedConnector: NewConnectorValues['selectedConnector']) =>
        fullIndexName && selectedConnector?.name,
    ],
    fullIndexName: [
      // TODO: this is the connector name. Rename this.
      () => [selectors.rawName, selectors.generatedNameData],
      (name: string, generatedName: NewConnectorValues['generatedNameData']) =>
        name ? name : generatedName?.connectorName ?? '',
    ],
    fullIndexNameExists: [
      () => [selectors.data, selectors.fullIndexName],
      (data: IndexExistsApiResponse | undefined, fullIndexName: string) =>
        data?.exists === true && data.indexName === fullIndexName,
    ],
    fullIndexNameIsValid: [
      // TODO: remove this if not used
      () => [selectors.fullIndexName],
      (fullIndexName) => isValidIndexName(fullIndexName),
    ],
    language: [
      // TODO: remove this if not used
      () => [selectors.languageSelectValue],
      (languageSelectValue) => getLanguageForOptimization(languageSelectValue),
    ],
  }),
});
