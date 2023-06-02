/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EnterpriseSearchEngineDetails } from '../../../../../common/types/engines';
import { Actions, createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface FetchEngineApiParams {
  engineName: string;
}

export type FetchEngineApiResponse = EnterpriseSearchEngineDetails;

export const fetchEngine = async ({
  engineName,
}: FetchEngineApiParams): Promise<FetchEngineApiResponse> => {
  const route = `/internal/enterprise_search/engines/${engineName}`;

  return await HttpLogic.values.http.get<EnterpriseSearchEngineDetails>(route);
};

export const FetchEngineApiLogic = createApiLogic(['fetch_engine_api_logic'], fetchEngine);

export type FetchEngineApiLogicActions = Actions<FetchEngineApiParams, FetchEngineApiResponse>;
