/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionsClient } from '../../../../actions/server';
import { ConnectorMappingsAttributes, GetFieldsResponse } from '../../../common/api';
import { CasesClientInternal } from '../client_internal';
import { CasesClientArgs } from '../types';
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

export const createConfigurationSubClient = (
  args: CasesClientArgs,
  casesClientInternal: CasesClientInternal
): ConfigureSubClient => {
  const { savedObjectsClient, connectorMappingsService, logger } = args;

  const configureSubClient: ConfigureSubClient = {
    getFields: (fields: ConfigurationGetFields) => getFields(fields),
    getMappings: (params: ConfigurationGetMappings) =>
      getMappings({
        ...params,
        savedObjectsClient,
        connectorMappingsService,
        casesClientInternal,
        logger,
      }),
  };

  return Object.freeze(configureSubClient);
};
