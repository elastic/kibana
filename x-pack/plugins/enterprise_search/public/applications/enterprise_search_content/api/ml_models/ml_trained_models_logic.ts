/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { kea, MakeLogicType } from 'kea';

import { MlTrainedModelStats } from '@elastic/elasticsearch/lib/api/types';
import { TrainedModelConfigResponse } from '@kbn/ml-plugin/common/types/trained_models';

import { ApiStatus, Status, HttpError } from '../../../../../common/types/api';
import { Actions } from '../../../shared/api_logic/create_api_logic';

import {
  GetMlModelsStatsResponse,
  MLModelsStatsApiLogic,
  MLModelsStatsApiLogicActions,
} from './ml_model_stats_logic';
import { GetMlModelsResponse, MLModelsApiLogic, MLModelsApiLogicActions } from './ml_models_logic';

export type TrainedModel = TrainedModelConfigResponse & Partial<MlTrainedModelStats>;

export type TrainedModelsApiLogicActions = Actions<undefined, TrainedModel[]> & {
  getModelsApiError: MLModelsApiLogicActions['apiError'];
  getModelsApiReset: MLModelsApiLogicActions['apiReset'];
  getModelsApiSuccess: MLModelsApiLogicActions['apiSuccess'];
  getModelsStatsApiError: MLModelsStatsApiLogicActions['apiError'];
  getModelsStatsApiReset: MLModelsStatsApiLogicActions['apiReset'];
  getModelsStatsApiSuccess: MLModelsStatsApiLogicActions['apiSuccess'];
  makeGetModelsRequest: MLModelsApiLogicActions['makeRequest'];
  makeGetModelsStatsRequest: MLModelsStatsApiLogicActions['makeRequest'];
};
export interface TrainedModelsApiLogicValues {
  error: HttpError | null;
  status: Status;
  data: TrainedModel[] | null;
  // models
  modelsApiStatus: ApiStatus<GetMlModelsResponse>;
  modelsData: GetMlModelsResponse | undefined;
  modelsApiError?: HttpError;
  modelsStatus: Status;
  // stats
  modelStatsApiStatus: ApiStatus<GetMlModelsStatsResponse>;
  modelStatsData: GetMlModelsStatsResponse | undefined;
  modelsStatsApiError?: HttpError;
  modelStatsStatus: Status;
}

export const TrainedModelsApiLogic = kea<
  MakeLogicType<TrainedModelsApiLogicValues, TrainedModelsApiLogicActions>
>({
  actions: {
    apiError: (error) => error,
    apiReset: true,
    apiSuccess: (result) => result,
    makeRequest: () => undefined,
  },
  connect: {
    actions: [
      MLModelsApiLogic,
      [
        'apiError as getModelsApiError',
        'apiReset as getModelsApiReset',
        'apiSuccess as getModelsApiSuccess',
        'makeRequest as makeGetModelsRequest',
      ],
      MLModelsStatsApiLogic,
      [
        'apiError as getModelsStatsApiError',
        'apiReset as getModelsStatsApiReset',
        'apiSuccess as getModelsStatsApiSuccess',
        'makeRequest as makeGetModelsStatsRequest',
      ],
    ],
    values: [
      MLModelsApiLogic,
      [
        'apiStatus as modelsApiStatus',
        'error as modelsApiError',
        'status as modelsStatus',
        'data as modelsData',
      ],
      MLModelsStatsApiLogic,
      [
        'apiStatus as modelStatsApiStatus',
        'error as modelsStatsApiError',
        'status as modelStatsStatus',
        'data as modelStatsData',
      ],
    ],
  },
  listeners: ({ actions, values }) => ({
    getModelsApiError: (error) => {
      actions.apiError(error);
    },
    getModelsApiSuccess: () => {
      if (!values.data) return;
      actions.apiSuccess(values.data);
    },
    getModelsStatsApiError: (error) => {
      if (values.modelsApiError) return;
      actions.apiError(error);
    },
    getModelsStatsApiSuccess: () => {
      if (!values.data) return;
      actions.apiSuccess(values.data);
    },
    apiReset: () => {
      actions.getModelsApiReset();
      actions.getModelsStatsApiReset();
    },
    makeRequest: () => {
      actions.makeGetModelsRequest(undefined);
      actions.makeGetModelsStatsRequest(undefined);
    },
  }),
  path: ['enterprise_search', 'api', 'ml_trained_models_api_logic'],
  selectors: ({ selectors }) => ({
    data: [
      () => [selectors.modelsData, selectors.modelStatsData],
      (
        modelsData: TrainedModelsApiLogicValues['modelsData'],
        modelStatsData: TrainedModelsApiLogicValues['modelStatsData']
      ): TrainedModel[] | null => {
        if (!modelsData) return null;
        if (!modelStatsData) return modelsData;
        const statsMap: Record<string, MlTrainedModelStats> =
          modelStatsData.trained_model_stats.reduce((map, value) => {
            if (value.model_id) {
              map[value.model_id] = value;
            }
            return map;
          }, {} as Record<string, MlTrainedModelStats>);
        return modelsData.map((modelConfig) => {
          const modelStats = statsMap[modelConfig.model_id];
          return {
            ...modelConfig,
            ...(modelStats ?? {}),
          };
        });
      },
    ],
    error: [
      () => [selectors.modelsApiStatus, selectors.modelStatsApiStatus],
      (
        modelsApiStatus: TrainedModelsApiLogicValues['modelsApiStatus'],
        modelStatsApiStatus: TrainedModelsApiLogicValues['modelStatsApiStatus']
      ) => {
        if (modelsApiStatus.error) return modelsApiStatus.error;
        if (modelStatsApiStatus.error) return modelStatsApiStatus.error;
        return null;
      },
    ],
    status: [
      () => [selectors.modelsApiStatus, selectors.modelStatsApiStatus],
      (
        modelsApiStatus: TrainedModelsApiLogicValues['modelsApiStatus'],
        modelStatsApiStatus: TrainedModelsApiLogicValues['modelStatsApiStatus']
      ) => {
        if (modelsApiStatus.status === modelStatsApiStatus.status) return modelsApiStatus.status;
        if (modelsApiStatus.status === Status.ERROR || modelStatsApiStatus.status === Status.ERROR)
          return Status.ERROR;
        if (modelsApiStatus.status < modelStatsApiStatus.status) return modelsApiStatus.status;
        return modelStatsApiStatus.status;
      },
    ],
  }),
});
