/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EnterpriseSearchEngineUpsertResponse } from '../../../../../common/types/engines';
import { Actions, createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface CreateEngineApiParams {
  engineName: string;
  indices: string[];
}

export type CreateEngineApiResponse = EnterpriseSearchEngineUpsertResponse;

export type CreateEngineApiLogicActions = Actions<CreateEngineApiParams, CreateEngineApiResponse>;

export const createEngine = async ({
  engineName,
  indices,
}: CreateEngineApiParams): Promise<CreateEngineApiResponse> => {
  const route = `/internal/enterprise_search/engines/${engineName}`;

  return await HttpLogic.values.http.put<EnterpriseSearchEngineUpsertResponse>(route, {
    body: JSON.stringify({ indices, name: engineName }),
    query: { create: true },
  });
};

export const CreateEngineApiLogic = createApiLogic(['create_engine_api_logic'], createEngine, {
  showErrorFlash: false,
});
