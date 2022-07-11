/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

import { CrawlerData, CrawlerDataFromServer } from './types';

import { crawlerDataServerToClient } from './utils';

export interface GetCrawlerArgs {
  indexName: string;
}

export const getCrawler = async ({ indexName }: GetCrawlerArgs): Promise<CrawlerData> => {
  const response = await HttpLogic.values.http.get<CrawlerDataFromServer>(
    `/internal/enterprise_search/indices/${indexName}/crawler`
  );

  return crawlerDataServerToClient(response);
};

export const GetCrawlerApiLogic = createApiLogic(['get_crawler_domain'], getCrawler);
