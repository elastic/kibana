/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE } from '@kbn/enterprise-search-plugin/common/constants';
import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';
import { LanguageForOptimization } from '../../components/new_index/types';

export interface CreateCrawlerIndexArgs {
  indexName: string;
  language: LanguageForOptimization;
}

interface CreateCrawlerIndexRequest {
  language: LanguageForOptimization;
}

export interface CreateCrawlerIndexResponse {
  updated: string; // the name of the updated index
}

export const createCrawlerIndex = async ({ indexName, language }: CreateCrawlerIndexArgs) => {
  const conn_route = '/internal/enterprise_search/connectors';
  const conn_params = {
    delete_existing_connector: true,
    index_name: indexName,
    service_type: ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE,
    language,
  };

  await HttpLogic.values.http.post(conn_route, {
    body: JSON.stringify(conn_params),
  });

  const route = `/internal/enterprise_search/crawler/${indexName}`;
  const params: CreateCrawlerIndexRequest = { language };

  return await HttpLogic.values.http.put<CreateCrawlerIndexResponse>(route, {
    body: JSON.stringify(params),
  });
};

export const CreateCrawlerIndexApiLogic = createApiLogic(
  ['create_crawler_index_api_logic'],
  createCrawlerIndex
);
