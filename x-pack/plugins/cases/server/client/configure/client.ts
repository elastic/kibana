/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionsClient } from '../../../../actions/server';
import { ConnectorMappingsAttributes, GetFieldsResponse } from '../../../common/api';
import { CasesSubClientImplementation } from '../types';
import { getFields } from './get_fields';
import { getMappings } from './get_mappings';

export interface ConfigurationGetFields {
  actionsClient: ActionsClient;
  connectorId: string;
  connectorType: string;
}

export interface ConfigurationGetMappings {
  actionsClient: ActionsClient;
  connectorId: string;
  connectorType: string;
}

export interface ConfigureSubClient {
  getFields(args: ConfigurationGetFields): Promise<GetFieldsResponse>;
  getMappings(args: ConfigurationGetMappings): Promise<ConnectorMappingsAttributes[]>;
}

export const createConfigurationSubClient: CasesSubClientImplementation<ConfigureSubClient> = (
  args,
  getClientsFactories
) => {
  const { savedObjectsClient, connectorMappingsService, logger } = args;
  const { getCasesInternalClient } = getClientsFactories;

  const configureSubClient: ConfigureSubClient = {
    getFields: (fields: ConfigurationGetFields) => getFields(fields),
    getMappings: (params: ConfigurationGetMappings) =>
      getMappings({
        ...params,
        savedObjectsClient,
        connectorMappingsService,
        getCasesInternalClient,
        logger,
      }),
  };

  return Object.freeze(configureSubClient);
};
