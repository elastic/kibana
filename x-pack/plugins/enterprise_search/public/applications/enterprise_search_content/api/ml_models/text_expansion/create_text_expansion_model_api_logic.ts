/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Actions, createApiLogic } from '../../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../../shared/http';

export type CreateTextExpansionModelArgs = undefined;

export interface CreateTextExpansionModelResponse {
  deploymentState: string;
  modelId: string;
}

export const createTextExpansionModel = async (): Promise<CreateTextExpansionModelResponse> => {
  console.log('createTextExpansionModel');
  const route = '/internal/enterprise_search/elser';
  const response = await HttpLogic.values.http.post<CreateTextExpansionModelResponse>(route, {
    body: undefined,
  });

  return response;
};

export const CreateTextExpansionModelApiLogic = createApiLogic(
  ['create_text_expansion_model_api_logic'],
  createTextExpansionModel,
);

export type CreateTextExpansionModelApiLogicActions = Actions<CreateTextExpansionModelArgs, CreateTextExpansionModelResponse>;
