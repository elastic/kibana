/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface GenerateConfigApiArgs {
  connectorId: string;
}

export const generateConnectorConfig = async ({ connectorId }: GenerateConfigApiArgs) => {
  const route = `/internal/enterprise_search/connectors/${connectorId}/generate_config`;
  return await HttpLogic.values.http.post(route);
};

export const GenerateConfigApiLogic = createApiLogic(
  ['generate_config_api_logic'],
  generateConnectorConfig
);
