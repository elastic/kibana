/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Actions, createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface RecreateCrawlerConnectorArgs {
  indexName: string;
}

export interface RecreateCrawlerConnectorResponse {
  created: string; // the name of the newly created index
}

export const recreateCrawlerConnector = async ({ indexName }: RecreateCrawlerConnectorArgs) => {
  const route = `/internal/enterprise_search/indices/${indexName}/crawler/connector`;

  return await HttpLogic.values.http.post<RecreateCrawlerConnectorResponse>(route);
};

export const RecreateCrawlerConnectorApiLogic = createApiLogic(
  ['recreate_crawler_connector_api_logic'],
  recreateCrawlerConnector
);

export type RecreateCrawlerConnectorActions = Actions<
  RecreateCrawlerConnectorArgs,
  RecreateCrawlerConnectorResponse
>;
