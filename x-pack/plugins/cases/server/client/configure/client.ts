/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionsClient } from '../../../../actions/server';
import { ConnectorMappingsAttributes, ActionConnector } from '../../../common/api';
import { CasesClientInternal } from '../client_internal';
import { CasesClientArgs } from '../types';
import { getMappings } from './get_mappings';

export interface ConfigurationGetMappings {
  actionsClient: ActionsClient;
  connector: ActionConnector;
}

export interface ConfigureSubClient {
  getMappings(args: ConfigurationGetMappings): Promise<ConnectorMappingsAttributes[]>;
}

export const createConfigurationSubClient = (
  args: CasesClientArgs,
  casesClientInternal: CasesClientInternal
): ConfigureSubClient => {
  const { savedObjectsClient, connectorMappingsService, logger, casesConnectors } = args;

  const configureSubClient: ConfigureSubClient = {
    getMappings: (params: ConfigurationGetMappings) =>
      getMappings({
        ...params,
        savedObjectsClient,
        connectorMappingsService,
        logger,
        casesConnectors,
      }),
  };

  return Object.freeze(configureSubClient);
};
