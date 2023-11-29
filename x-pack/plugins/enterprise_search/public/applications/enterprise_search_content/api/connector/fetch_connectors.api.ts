/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Connector } from '@kbn/search-connectors';

import { Meta } from '../../../../../common/types/pagination';

import { createApiLogic, Actions } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface FetchConnectorsApiLogicArgs {
  connectorType: 'crawler' | 'connector';
  from: number;
  searchQuery?: string;
  size: number;
}
export interface FetchConnectorsApiLogicResponse {
  connectors: Connector[];
  meta: Meta;
}

export const fetchConnectors = async ({
  connectorType,
  from,
  size,
  searchQuery,
}: FetchConnectorsApiLogicArgs): Promise<FetchConnectorsApiLogicResponse> => {
  const route = '/internal/enterprise_search/connectors';
  const query = { connector_type: connectorType, from, searchQuery, size };
  const result = await HttpLogic.values.http.get<FetchConnectorsApiLogicResponse>(route, { query });
  return result;
};

export const FetchConnectorsApiLogic = createApiLogic(
  ['fetch_connectors_api_logic'],
  fetchConnectors
);

export type FetchConnectorsApiLogicActions = Actions<
  FetchConnectorsApiLogicArgs,
  FetchConnectorsApiLogicResponse
>;
