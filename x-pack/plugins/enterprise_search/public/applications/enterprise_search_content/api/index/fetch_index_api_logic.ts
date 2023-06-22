/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchIndexWithIngestion } from '../../../../../common/types/indices';
import { Actions, createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface FetchIndexApiParams {
  indexName: string;
}

export type FetchIndexApiResponse = ElasticsearchIndexWithIngestion & {
  has_in_progress_syncs?: boolean;
};

export const fetchIndex = async ({
  indexName,
}: FetchIndexApiParams): Promise<FetchIndexApiResponse> => {
  const route = `/internal/enterprise_search/indices/${indexName}`;

  return await HttpLogic.values.http.get<FetchIndexApiResponse>(route);
};

export const FetchIndexApiLogic = createApiLogic(['fetch_index_api_logic'], fetchIndex, {
  clearFlashMessagesOnMakeRequest: false,
  showErrorFlash: false,
});

export type FetchIndexActions = Actions<FetchIndexApiParams, FetchIndexApiResponse>;
