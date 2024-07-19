/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeleteConnectorResponse } from '../../../../../common/types/connectors';

import { Actions, createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface DeleteConnectorCrawlerApiLogicArgs {
  connectorCrawlerId: string;
}

export interface DeleteConnectorCrawlerApiLogicResponse {
  acknowledged: boolean;
}

export const deleteConnector = async ({
  connectorCrawlerId,
}: DeleteConnectorCrawlerApiLogicArgs) => {
  console.log('called');
  return await HttpLogic.values.http.delete(
    `/internal/enterprise_search/connectors/crawler/${connectorCrawlerId}`
  );
};

export const DeleteConnectorCrawlerApiLogic = createApiLogic(
  ['delete_connector_crawler_api_logic'],
  deleteConnector
);

export type DeleteConnectorCrawlerApiLogicActions = Actions<
  DeleteConnectorCrawlerApiLogicArgs,
  DeleteConnectorResponse
>;
