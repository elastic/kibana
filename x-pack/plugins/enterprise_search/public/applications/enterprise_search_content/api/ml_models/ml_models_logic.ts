/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { TrainedModelConfigResponse } from '@kbn/ml-plugin/common/types/trained_models';

import { Actions, createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export type GetMlModelsArgs = number | undefined;

export type GetMlModelsResponse = TrainedModelConfigResponse[];

export const getMLModels = async (size: GetMlModelsArgs = 1000) => {
  return await HttpLogic.values.http.get<TrainedModelConfigResponse[]>(
    '/internal/ml/trained_models',
    {
      query: { size, with_pipelines: true },
      version: '1',
    }
  );
};

export const MLModelsApiLogic = createApiLogic(['ml_models_api_logic'], getMLModels, {
  clearFlashMessagesOnMakeRequest: false,
  showErrorFlash: false,
});

export type MLModelsApiLogicActions = Actions<GetMlModelsArgs, GetMlModelsResponse>;
