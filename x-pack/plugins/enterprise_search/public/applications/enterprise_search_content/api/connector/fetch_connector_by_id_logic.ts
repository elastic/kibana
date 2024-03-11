/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Connector } from '@kbn/search-connectors';

import { createApiLogic, Actions } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface FetchConnectorByIdApiLogicArgs {
  connectorId: string;
}
export interface FetchConnectorByIdApiLogicResponse {
  connector: Connector | undefined;
}

export const fetchConnectorById = async ({
  connectorId,
}: FetchConnectorByIdApiLogicArgs): Promise<FetchConnectorByIdApiLogicResponse> => {
  const route = `/internal/enterprise_search/connectors/${connectorId}`;
  const response = await HttpLogic.values.http.get<FetchConnectorByIdApiLogicResponse>(route);
  return response;
};

export const FetchConnectorByIdApiLogic = createApiLogic(
  ['fetch_connector_by_id_api_logic'],
  fetchConnectorById
);

export type FetchConnectorByIdApiLogicActions = Actions<
  FetchConnectorByIdApiLogicArgs,
  FetchConnectorByIdApiLogicResponse
>;
