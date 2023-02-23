/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { LogicMounter } from '../../../__mocks__/kea_logic';
import { mlModels, mlModelStats } from '../../__mocks__/ml_models.mock';

import { HttpError, Status } from '../../../../../common/types/api';

import { MLModelsStatsApiLogic } from './ml_model_stats_logic';
import { MLModelsApiLogic } from './ml_models_logic';
import { TrainedModelsApiLogic, TrainedModelsApiLogicValues } from './ml_trained_models_logic';

const DEFAULT_VALUES: TrainedModelsApiLogicValues = {
  error: null,
  status: Status.IDLE,
  data: null,
  // models
  modelsApiStatus: {
    status: Status.IDLE,
  },
  modelsData: undefined,
  modelsApiError: undefined,
  modelsStatus: Status.IDLE,
  // stats
  modelStatsApiStatus: {
    status: Status.IDLE,
  },
  modelStatsData: undefined,
  modelsStatsApiError: undefined,
  modelStatsStatus: Status.IDLE,
};

describe('TrainedModelsApiLogic', () => {
  const { mount } = new LogicMounter(TrainedModelsApiLogic);
  const { mount: mountMLModelsApiLogic } = new LogicMounter(MLModelsApiLogic);
  const { mount: mountMLModelsStatsApiLogic } = new LogicMounter(MLModelsStatsApiLogic);

  beforeEach(() => {
    jest.clearAllMocks();

    mountMLModelsApiLogic();
    mountMLModelsStatsApiLogic();
    mount();
  });

  it('has default values', () => {
    expect(TrainedModelsApiLogic.values).toEqual(DEFAULT_VALUES);
  });
  describe('selectors', () => {
    describe('data', () => {
      it('returns combined trained models', () => {
        MLModelsApiLogic.actions.apiSuccess(mlModels);
        MLModelsStatsApiLogic.actions.apiSuccess(mlModelStats);

        expect(TrainedModelsApiLogic.values.data).toEqual([
          {
            ...mlModels[0],
            ...mlModelStats.trained_model_stats[0],
          },
          {
            ...mlModels[1],
            ...mlModelStats.trained_model_stats[1],
          },
        ]);
      });
      it('returns just models if stats not available', () => {
        MLModelsApiLogic.actions.apiSuccess(mlModels);

        expect(TrainedModelsApiLogic.values.data).toEqual(mlModels);
      });
      it('returns null trained models even with stats if models missing', () => {
        MLModelsStatsApiLogic.actions.apiSuccess(mlModelStats);

        expect(TrainedModelsApiLogic.values.data).toEqual(null);
      });
    });
    describe('error', () => {
      const modelError: HttpError = {
        body: {
          error: 'Model Error',
          statusCode: 400,
        },
        fetchOptions: {},
        request: {},
      } as HttpError;
      const statsError: HttpError = {
        body: {
          error: 'Stats Error',
          statusCode: 500,
        },
        fetchOptions: {},
        request: {},
      } as HttpError;

      it('returns null with no errors', () => {
        MLModelsApiLogic.actions.apiSuccess(mlModels);
        MLModelsStatsApiLogic.actions.apiSuccess(mlModelStats);

        expect(TrainedModelsApiLogic.values.error).toBeNull();
      });
      it('models error', () => {
        MLModelsApiLogic.actions.apiError(modelError);

        expect(TrainedModelsApiLogic.values.error).toBe(modelError);
      });
      it('stats error', () => {
        MLModelsStatsApiLogic.actions.apiError(statsError);

        expect(TrainedModelsApiLogic.values.error).toBe(statsError);
      });
      it('prefers models error if both api calls fail', () => {
        MLModelsApiLogic.actions.apiError(modelError);
        MLModelsStatsApiLogic.actions.apiError(statsError);

        expect(TrainedModelsApiLogic.values.error).toBe(modelError);
      });
    });
    describe('status', () => {
      it('returns matching status for both calls', () => {
        MLModelsApiLogic.actions.apiSuccess(mlModels);
        MLModelsStatsApiLogic.actions.apiSuccess(mlModelStats);

        expect(TrainedModelsApiLogic.values.status).toEqual(Status.SUCCESS);
      });
      it('returns models status when its lower', () => {
        MLModelsStatsApiLogic.actions.apiSuccess(mlModelStats);

        expect(TrainedModelsApiLogic.values.status).toEqual(Status.IDLE);
      });
      it('returns stats status when its lower', () => {
        MLModelsApiLogic.actions.apiSuccess(mlModels);

        expect(TrainedModelsApiLogic.values.status).toEqual(Status.IDLE);
      });
      it('returns error status if one api call fails', () => {
        MLModelsApiLogic.actions.apiSuccess(mlModels);
        MLModelsStatsApiLogic.actions.apiError({
          body: {
            error: 'Stats Error',
            statusCode: 500,
          },
          fetchOptions: {},
          request: {},
        } as HttpError);

        expect(TrainedModelsApiLogic.values.status).toEqual(Status.ERROR);
      });
    });
  });
  describe('actions', () => {
    it('makeRequest fetches models and stats', () => {
      jest.spyOn(TrainedModelsApiLogic.actions, 'makeGetModelsRequest');
      jest.spyOn(TrainedModelsApiLogic.actions, 'makeGetModelsStatsRequest');

      TrainedModelsApiLogic.actions.makeRequest(undefined);

      expect(TrainedModelsApiLogic.actions.makeGetModelsRequest).toHaveBeenCalledTimes(1);
      expect(TrainedModelsApiLogic.actions.makeGetModelsStatsRequest).toHaveBeenCalledTimes(1);
    });
    it('apiReset resets both api logics', () => {
      jest.spyOn(TrainedModelsApiLogic.actions, 'getModelsApiReset');
      jest.spyOn(TrainedModelsApiLogic.actions, 'getModelsStatsApiReset');

      TrainedModelsApiLogic.actions.apiReset();

      expect(TrainedModelsApiLogic.actions.getModelsApiReset).toHaveBeenCalledTimes(1);
      expect(TrainedModelsApiLogic.actions.getModelsStatsApiReset).toHaveBeenCalledTimes(1);
    });
  });
});
