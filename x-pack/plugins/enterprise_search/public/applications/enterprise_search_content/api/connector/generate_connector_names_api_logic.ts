/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface GenerateConnectorNamesApiArgs {
  connectorType?: string;
}

export const generateConnectorNames = async (
  { connectorType }: GenerateConnectorNamesApiArgs = { connectorType: 'custom' }
) => {
  const route = `/internal/enterprise_search/connectors/generate_connector_name`;
  return await HttpLogic.values.http.post(route, {
    body: JSON.stringify({ connectorType }),
  });
};

export const GenerateConnectorNamesApiLogic = createApiLogic(
  ['generate_config_api_logic'],
  generateConnectorNames
);
