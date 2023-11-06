/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Connector } from '@kbn/search-connectors';

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface FetchConnectorsApiLogicArgs {
  connectorType: 'crawler' | 'connector';
}
// TODO
export interface FetchConnectorsApiLogicResponse {
  connectors: Connector[];
}

export const fetchConnectors = async ({
  connectorType,
}: FetchConnectorsApiLogicArgs): Promise<FetchConnectorsApiLogicResponse> => {
  const route = '/internal/enterprise_search/connectors';
  const query = { connector_type: connectorType };
  const result = await HttpLogic.values.http.get<Connector[]>(route, { query });
  return {
    connectors: result,
  };
};

export const FetchConnectorsApiLogic = createApiLogic(
  ['fetch_connectors_api_logic'],
  fetchConnectors
);
