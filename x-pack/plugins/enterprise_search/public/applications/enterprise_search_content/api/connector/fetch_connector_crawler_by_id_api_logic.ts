/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Connector } from '@kbn/search-connectors';

import { createApiLogic, Actions } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface FetchConnectorCrawlerByIdApiLogicArgs {
  connectorCrawlerId: string;
}
export interface FetchConnectorCrawlerByIdApiLogicResponse {
  connector: Connector | undefined;
}

export const fetchConnectorById = async ({
  connectorCrawlerId,
}: FetchConnectorCrawlerByIdApiLogicArgs): Promise<FetchConnectorCrawlerByIdApiLogicResponse> => {
  const route = `/internal/enterprise_search/connectors/crawler/${connectorCrawlerId}`;
  const response = await HttpLogic.values.http.get<FetchConnectorCrawlerByIdApiLogicResponse>(
    route
  );
  return response;
};

export const FetchConnectorCrawlerByIdApiLogic = createApiLogic(
  ['fetch_connector_crawler_by_id_api_logic'],
  fetchConnectorById
);

export type FetchConnectorCrawlerByIdApiLogicActions = Actions<
  FetchConnectorCrawlerByIdApiLogicArgs,
  FetchConnectorCrawlerByIdApiLogicResponse
>;
