/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EnterpriseSearchEngine } from '../../../../../common/types/engines';
import { Actions, createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface UpdateEngineApiParams {
  engineName: string;
  indices: string[];
}

export type UpdateEngineApiResponse = EnterpriseSearchEngine;

export type UpdateEngineApiLogicActions = Actions<UpdateEngineApiParams, UpdateEngineApiResponse>;

export const updateEngine = async ({
  engineName,
  indices,
}: UpdateEngineApiParams): Promise<UpdateEngineApiResponse> => {
  const route = `/internal/enterprise_search/engines/${engineName}`;

  return await HttpLogic.values.http.put<EnterpriseSearchEngine>(route, {
    body: JSON.stringify({ indices, name: engineName }),
  });
};

export const UpdateEngineApiLogic = createApiLogic(['update_engine_api_logic'], updateEngine);
