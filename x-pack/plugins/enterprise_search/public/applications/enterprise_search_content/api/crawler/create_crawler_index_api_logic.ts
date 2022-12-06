/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';
import { LanguageForOptimization } from '../../components/new_index/types';

export interface CreateCrawlerIndexArgs {
  indexName: string;
  language: LanguageForOptimization;
}

interface CreateCrawlerIndexRequest {
  index_name: string;
  language: LanguageForOptimization;
}

export interface CreateCrawlerIndexResponse {
  created: string; // the name of the newly created index
}

export const createCrawlerIndex = async ({ indexName, language }: CreateCrawlerIndexArgs) => {
  const route = '/internal/enterprise_search/crawler';

  const params: CreateCrawlerIndexRequest = {
    index_name: indexName,
    language,
  };

  return await HttpLogic.values.http.post<CreateCrawlerIndexResponse>(route, {
    body: JSON.stringify(params),
  });
};

export const CreateCrawlerIndexApiLogic = createApiLogic(
  ['create_crawler_index_api_logic'],
  createCrawlerIndex
);
