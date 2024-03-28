/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Connector } from '@kbn/search-connectors';

import { Status } from '../../../../../common/types/api';

import { Actions } from '../../../shared/api_logic/create_api_logic';
import {
  ConnectorNameAndDescriptionApiLogic,
  PutConnectorNameAndDescriptionArgs,
  PutConnectorNameAndDescriptionResponse,
} from '../../api/connector/update_connector_name_and_description_api_logic';

type NameAndDescription = Partial<Pick<Connector, 'name' | 'description'>>;

export type ConnectorNameAndDescriptionActions = Pick<
  Actions<PutConnectorNameAndDescriptionArgs, PutConnectorNameAndDescriptionResponse>,
  'makeRequest' | 'apiSuccess' | 'apiError'
> & {
  saveNameAndDescription(nameAndDescription: NameAndDescription): NameAndDescription;
  setConnector(connector: Connector): Connector;
};

interface ConnectorNameAndDescriptionValues {
  connector: Connector | null;
  isFailed: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  status: Status;
}

export const ConnectorNameAndDescriptionLogic = kea<
  MakeLogicType<ConnectorNameAndDescriptionValues, ConnectorNameAndDescriptionActions>
>({
  actions: {
    saveNameAndDescription: (nameAndDescription) => nameAndDescription,
    setConnector: (connector) => connector,
  },
  connect: {
    actions: [ConnectorNameAndDescriptionApiLogic, ['makeRequest', 'apiSuccess', 'apiError']],
    values: [ConnectorNameAndDescriptionApiLogic, ['status']],
  },
  listeners: ({ actions, values }) => ({
    saveNameAndDescription: ({ name, description }) => {
      if (values.connector) {
        actions.makeRequest({
          connectorId: values.connector.id,
          description,
          name,
        });
      }
    },
  }),
  path: ['enterprise_search', 'content', 'connector', 'name_and_description'],
  reducers: () => ({
    connector: [
      null,
      {
        setConnector: (_, connector) => connector,
      },
    ],
  }),
  selectors: ({ selectors }) => ({
    isFailed: [() => [selectors.status], (status: Status) => status === Status.ERROR],
    isLoading: [() => [selectors.status], (status: Status) => status === Status.LOADING],
    isSuccess: [() => [selectors.status], (status: Status) => status === Status.SUCCESS],
  }),
});
