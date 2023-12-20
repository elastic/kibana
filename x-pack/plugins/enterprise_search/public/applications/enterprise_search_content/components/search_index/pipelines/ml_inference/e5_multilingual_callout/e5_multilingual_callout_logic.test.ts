/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../../../../__mocks__/kea_logic';

import { HttpResponse } from '@kbn/core/public';

import { ErrorResponse, HttpError, Status } from '../../../../../../../../common/types/api';
import { MlModelDeploymentState } from '../../../../../../../../common/types/ml';
import { CreateE5MultilingualModelApiLogic } from '../../../../../api/ml_models/e5_multilingual/create_e5_multilingual_model_api_logic';
import { FetchE5MultilingualModelApiLogic } from '../../../../../api/ml_models/e5_multilingual/fetch_e5_multilingual_model_api_logic';
import { StartE5MultilingualModelApiLogic } from '../../../../../api/ml_models/e5_multilingual/start_e5_multilingual_model_api_logic';

import {
  E5MultilingualCalloutLogic,
  E5MultilingualCalloutValues,
  getE5MultilingualError,
} from './e5_multilingual_callout_logic';

const DEFAULT_VALUES: E5MultilingualCalloutValues = {
  createE5MultilingualModelError: undefined,
  createE5MultilingualModelStatus: Status.IDLE,
  createdE5MultilingualModel: undefined,
  fetchE5MultilingualModelError: undefined,
  isCreateButtonDisabled: false,
  isModelDownloadInProgress: false,
  isModelDownloaded: false,
  isModelRunningSingleThreaded: false,
  isModelStarted: false,
  isPollingE5MultilingualModelActive: false,
  isStartButtonDisabled: false,
  startE5MultilingualModelError: undefined,
  startE5MultilingualModelStatus: Status.IDLE,
  e5MultilingualModel: undefined,
  e5MultilingualModelPollTimeoutId: null,
  e5MultilingualError: null,
};

jest.useFakeTimers();

describe('E5MultilingualCalloutLogic', () => {
  const { mount } = new LogicMounter(E5MultilingualCalloutLogic);
  const { mount: mountCreateE5MultilingualModelApiLogic } = new LogicMounter(
    CreateE5MultilingualModelApiLogic
  );
  const { mount: mountFetchE5MultilingualModelApiLogic } = new LogicMounter(
    FetchE5MultilingualModelApiLogic
  );
  const { mount: mountStartE5MultilingualModelApiLogic } = new LogicMounter(
    StartE5MultilingualModelApiLogic
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mountCreateE5MultilingualModelApiLogic();
    mountFetchE5MultilingualModelApiLogic();
    mountStartE5MultilingualModelApiLogic();
    mount();
  });

  it('has expected default values', () => {
    expect(E5MultilingualCalloutLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('getE5MultilingualError', () => {
    const error = {
      body: {
        error: 'some-error',
        message: 'some-error-message',
        statusCode: 500,
      },
    } as HttpError;
    it('returns null if there is no error', () => {
      expect(getE5MultilingualError(undefined, undefined, undefined)).toBe(null);
    });
    it('uses the correct title and message from a create error', () => {
      expect(getE5MultilingualError(error, undefined, undefined)).toEqual({
        title: 'Error with E5 Multilingual deployment',
        message: error.body?.message,
      });
    });
    it('uses the correct title and message from a fetch error', () => {
      expect(getE5MultilingualError(undefined, error, undefined)).toEqual({
        title: 'Error fetching E5 Multilingual model',
        message: error.body?.message,
      });
    });
    it('uses the correct title and message from a start error', () => {
      expect(getE5MultilingualError(undefined, undefined, error)).toEqual({
        title: 'Error starting E5 Multilingual deployment',
        message: error.body?.message,
      });
    });
  });

  describe('listeners', () => {
    describe('createE5MultilingualModelPollingTimeout', () => {
      const duration = 5000;
      it('sets polling timeout', () => {
        jest.spyOn(global, 'setTimeout');
        jest.spyOn(E5MultilingualCalloutLogic.actions, 'setE5MultilingualModelPollingId');

        E5MultilingualCalloutLogic.actions.createE5MultilingualModelPollingTimeout(duration);

        expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), duration);
        expect(
          E5MultilingualCalloutLogic.actions.setE5MultilingualModelPollingId
        ).toHaveBeenCalled();
      });
      it('clears polling timeout if it is set', () => {
        mount({
          ...DEFAULT_VALUES,
          e5MultilingualModelPollTimeoutId: 'timeout-id',
        });

        jest.spyOn(global, 'clearTimeout');

        E5MultilingualCalloutLogic.actions.createE5MultilingualModelPollingTimeout(duration);

        expect(clearTimeout).toHaveBeenCalledWith('timeout-id');
      });
    });

    describe('createE5MultilingualModelSuccess', () => {
      it('sets createdE5MultilingualModel', () => {
        jest.spyOn(E5MultilingualCalloutLogic.actions, 'fetchE5MultilingualModel');
        jest.spyOn(E5MultilingualCalloutLogic.actions, 'startPollingE5MultilingualModel');

        E5MultilingualCalloutLogic.actions.createE5MultilingualModelSuccess({
          deploymentState: MlModelDeploymentState.Downloading,
          modelId: 'mock-model-id',
        });

        expect(E5MultilingualCalloutLogic.actions.fetchE5MultilingualModel).toHaveBeenCalled();
        expect(
          E5MultilingualCalloutLogic.actions.startPollingE5MultilingualModel
        ).toHaveBeenCalled();
      });
    });

    describe('fetchE5MultilingualModelSuccess', () => {
      const data = {
        deploymentState: MlModelDeploymentState.Downloading,
        modelId: 'mock-model-id',
        targetAllocationCount: 1,
        nodeAllocationCount: 1,
        threadsPerAllocation: 1,
      };

      it('starts polling when the model is downloading and polling is not active', () => {
        mount({
          ...DEFAULT_VALUES,
        });
        jest.spyOn(E5MultilingualCalloutLogic.actions, 'startPollingE5MultilingualModel');

        E5MultilingualCalloutLogic.actions.fetchE5MultilingualModelSuccess(data);

        expect(
          E5MultilingualCalloutLogic.actions.startPollingE5MultilingualModel
        ).toHaveBeenCalled();
      });
      it('sets polling timeout when the model is downloading and polling is active', () => {
        mount({
          ...DEFAULT_VALUES,
          e5MultilingualModelPollTimeoutId: 'timeout-id',
        });
        jest.spyOn(E5MultilingualCalloutLogic.actions, 'createE5MultilingualModelPollingTimeout');

        E5MultilingualCalloutLogic.actions.fetchE5MultilingualModelSuccess(data);

        expect(
          E5MultilingualCalloutLogic.actions.createE5MultilingualModelPollingTimeout
        ).toHaveBeenCalled();
      });
      it('stops polling when the model is downloaded and polling is active', () => {
        mount({
          ...DEFAULT_VALUES,
          e5MultilingualModelPollTimeoutId: 'timeout-id',
        });
        jest.spyOn(E5MultilingualCalloutLogic.actions, 'stopPollingE5MultilingualModel');

        E5MultilingualCalloutLogic.actions.fetchE5MultilingualModelSuccess({
          deploymentState: MlModelDeploymentState.Downloaded,
          modelId: 'mock-model-id',
          targetAllocationCount: 1,
          nodeAllocationCount: 1,
          threadsPerAllocation: 1,
        });

        expect(
          E5MultilingualCalloutLogic.actions.stopPollingE5MultilingualModel
        ).toHaveBeenCalled();
      });
    });

    describe('fetchE5MultilingualModelError', () => {
      it('stops polling if it is active', () => {
        mount({
          ...DEFAULT_VALUES,
          e5MultilingualModelPollTimeoutId: 'timeout-id',
        });
        jest.spyOn(E5MultilingualCalloutLogic.actions, 'createE5MultilingualModelPollingTimeout');

        E5MultilingualCalloutLogic.actions.fetchE5MultilingualModelError({
          body: {
            error: '',
            message: 'some error',
            statusCode: 500,
          },
        } as HttpResponse<ErrorResponse>);

        expect(
          E5MultilingualCalloutLogic.actions.createE5MultilingualModelPollingTimeout
        ).toHaveBeenCalled();
      });
    });

    describe('startPollingE5MultilingualModel', () => {
      it('sets polling timeout', () => {
        jest.spyOn(E5MultilingualCalloutLogic.actions, 'createE5MultilingualModelPollingTimeout');

        E5MultilingualCalloutLogic.actions.startPollingE5MultilingualModel();

        expect(
          E5MultilingualCalloutLogic.actions.createE5MultilingualModelPollingTimeout
        ).toHaveBeenCalled();
      });
      it('clears polling timeout if it is set', () => {
        mount({
          ...DEFAULT_VALUES,
          e5MultilingualModelPollTimeoutId: 'timeout-id',
        });

        jest.spyOn(global, 'clearTimeout');

        E5MultilingualCalloutLogic.actions.startPollingE5MultilingualModel();

        expect(clearTimeout).toHaveBeenCalledWith('timeout-id');
      });
    });

    describe('startE5MultilingualModelSuccess', () => {
      it('sets startedE5MultilingualModel', () => {
        jest.spyOn(E5MultilingualCalloutLogic.actions, 'fetchE5MultilingualModel');

        E5MultilingualCalloutLogic.actions.startE5MultilingualModelSuccess({
          deploymentState: MlModelDeploymentState.FullyAllocated,
          modelId: 'mock-model-id',
        });

        expect(E5MultilingualCalloutLogic.actions.fetchE5MultilingualModel).toHaveBeenCalled();
      });
    });

    describe('stopPollingE5MultilingualModel', () => {
      it('clears polling timeout and poll timeout ID if it is set', () => {
        mount({
          ...DEFAULT_VALUES,
          e5MultilingualModelPollTimeoutId: 'timeout-id',
        });

        jest.spyOn(global, 'clearTimeout');
        jest.spyOn(E5MultilingualCalloutLogic.actions, 'clearE5MultilingualModelPollingId');

        E5MultilingualCalloutLogic.actions.stopPollingE5MultilingualModel();

        expect(clearTimeout).toHaveBeenCalledWith('timeout-id');
        expect(
          E5MultilingualCalloutLogic.actions.clearE5MultilingualModelPollingId
        ).toHaveBeenCalled();
      });
    });
  });

  describe('reducers', () => {
    describe('e5MultilingualModelPollTimeoutId', () => {
      it('gets cleared on clearE5MultilingualModelPollingId', () => {
        E5MultilingualCalloutLogic.actions.clearE5MultilingualModelPollingId();

        expect(E5MultilingualCalloutLogic.values.e5MultilingualModelPollTimeoutId).toBe(null);
      });
      it('gets set on setE5MultilingualModelPollingId', () => {
        const timeout = setTimeout(() => {}, 500);
        E5MultilingualCalloutLogic.actions.setE5MultilingualModelPollingId(timeout);

        expect(E5MultilingualCalloutLogic.values.e5MultilingualModelPollTimeoutId).toEqual(timeout);
      });
    });
  });

  describe('selectors', () => {
    describe('isCreateButtonDisabled', () => {
      it('is set to false if the fetch model API is idle', () => {
        CreateE5MultilingualModelApiLogic.actions.apiReset();
        expect(E5MultilingualCalloutLogic.values.isCreateButtonDisabled).toBe(false);
      });
      it('is set to true if the fetch model API is not idle', () => {
        CreateE5MultilingualModelApiLogic.actions.apiSuccess({
          deploymentState: MlModelDeploymentState.Downloading,
          modelId: 'mock-model-id',
        });
        expect(E5MultilingualCalloutLogic.values.isCreateButtonDisabled).toBe(true);
      });
    });

    describe('e5MultilingualError', () => {
      const error = {
        body: {
          error: 'Error with E5 Multilingual deployment',
          message: 'Mocked error message',
          statusCode: 500,
        },
      } as HttpError;

      it('returns null when there are no errors', () => {
        CreateE5MultilingualModelApiLogic.actions.apiReset();
        FetchE5MultilingualModelApiLogic.actions.apiReset();
        StartE5MultilingualModelApiLogic.actions.apiReset();
        expect(E5MultilingualCalloutLogic.values.e5MultilingualError).toBe(null);
      });
      it('returns extracted error for create', () => {
        CreateE5MultilingualModelApiLogic.actions.apiError(error);
        expect(E5MultilingualCalloutLogic.values.e5MultilingualError).toStrictEqual({
          title: 'Error with E5 Multilingual deployment',
          message: 'Mocked error message',
        });
      });
      it('returns extracted error for fetch', () => {
        FetchE5MultilingualModelApiLogic.actions.apiError(error);
        expect(E5MultilingualCalloutLogic.values.e5MultilingualError).toStrictEqual({
          title: 'Error fetching E5 Multilingual model',
          message: 'Mocked error message',
        });
      });
      it('returns extracted error for start', () => {
        StartE5MultilingualModelApiLogic.actions.apiError(error);
        expect(E5MultilingualCalloutLogic.values.e5MultilingualError).toStrictEqual({
          title: 'Error starting E5 Multilingual deployment',
          message: 'Mocked error message',
        });
      });
    });

    describe('isModelDownloadInProgress', () => {
      it('is set to true if the model is downloading', () => {
        FetchE5MultilingualModelApiLogic.actions.apiSuccess({
          deploymentState: MlModelDeploymentState.Downloading,
          modelId: 'mock-model-id',
          targetAllocationCount: 1,
          nodeAllocationCount: 1,
          threadsPerAllocation: 1,
        });
        expect(E5MultilingualCalloutLogic.values.isModelDownloadInProgress).toBe(true);
      });
      it('is set to false if the model is downloading', () => {
        FetchE5MultilingualModelApiLogic.actions.apiSuccess({
          deploymentState: MlModelDeploymentState.Started,
          modelId: 'mock-model-id',
          targetAllocationCount: 1,
          nodeAllocationCount: 1,
          threadsPerAllocation: 1,
        });
        expect(E5MultilingualCalloutLogic.values.isModelDownloadInProgress).toBe(false);
      });
    });

    describe('isModelDownloaded', () => {
      it('is set to true if the model is downloaded', () => {
        FetchE5MultilingualModelApiLogic.actions.apiSuccess({
          deploymentState: MlModelDeploymentState.Downloaded,
          modelId: 'mock-model-id',
          targetAllocationCount: 1,
          nodeAllocationCount: 1,
          threadsPerAllocation: 1,
        });
        expect(E5MultilingualCalloutLogic.values.isModelDownloaded).toBe(true);
      });
      it('is set to false if the model is not downloaded', () => {
        FetchE5MultilingualModelApiLogic.actions.apiSuccess({
          deploymentState: MlModelDeploymentState.NotDeployed,
          modelId: 'mock-model-id',
          targetAllocationCount: 1,
          nodeAllocationCount: 1,
          threadsPerAllocation: 1,
        });
        expect(E5MultilingualCalloutLogic.values.isModelDownloaded).toBe(false);
      });
    });

    describe('isModelRunningSingleThreaded', () => {
      it('is set to true if the model has 1 target allocation and 1 thread', () => {
        FetchE5MultilingualModelApiLogic.actions.apiSuccess({
          deploymentState: MlModelDeploymentState.FullyAllocated,
          modelId: 'mock-model-id',
          targetAllocationCount: 1,
          nodeAllocationCount: 1,
          threadsPerAllocation: 1,
        });
        expect(E5MultilingualCalloutLogic.values.isModelRunningSingleThreaded).toBe(true);
      });
      it('is set to false if the model has multiple target allocations', () => {
        FetchE5MultilingualModelApiLogic.actions.apiSuccess({
          deploymentState: MlModelDeploymentState.FullyAllocated,
          modelId: 'mock-model-id',
          targetAllocationCount: 2,
          nodeAllocationCount: 2,
          threadsPerAllocation: 1,
        });
        expect(E5MultilingualCalloutLogic.values.isModelRunningSingleThreaded).toBe(false);
      });
      it('is set to false if the model runs on multiple threads', () => {
        FetchE5MultilingualModelApiLogic.actions.apiSuccess({
          deploymentState: MlModelDeploymentState.FullyAllocated,
          modelId: 'mock-model-id',
          targetAllocationCount: 1,
          nodeAllocationCount: 1,
          threadsPerAllocation: 4,
        });
        expect(E5MultilingualCalloutLogic.values.isModelRunningSingleThreaded).toBe(false);
      });
    });

    describe('isModelStarted', () => {
      it('is set to true if the model is started', () => {
        FetchE5MultilingualModelApiLogic.actions.apiSuccess({
          deploymentState: MlModelDeploymentState.FullyAllocated,
          modelId: 'mock-model-id',
          targetAllocationCount: 1,
          nodeAllocationCount: 1,
          threadsPerAllocation: 1,
        });
        expect(E5MultilingualCalloutLogic.values.isModelStarted).toBe(true);
      });
      it('is set to false if the model is not started', () => {
        FetchE5MultilingualModelApiLogic.actions.apiSuccess({
          deploymentState: MlModelDeploymentState.NotDeployed,
          modelId: 'mock-model-id',
          targetAllocationCount: 1,
          nodeAllocationCount: 1,
          threadsPerAllocation: 1,
        });
        expect(E5MultilingualCalloutLogic.values.isModelStarted).toBe(false);
      });
    });

    describe('isPollingE5MultilingualModelActive', () => {
      it('is set to false if polling is not active', () => {
        mount({
          ...DEFAULT_VALUES,
          e5MultilingualModelPollTimeoutId: null,
        });

        expect(E5MultilingualCalloutLogic.values.isPollingE5MultilingualModelActive).toBe(false);
      });
      it('is set to true if polling is active', () => {
        mount({
          ...DEFAULT_VALUES,
          e5MultilingualModelPollTimeoutId: 'timeout-id',
        });

        expect(E5MultilingualCalloutLogic.values.isPollingE5MultilingualModelActive).toBe(true);
      });
    });
  });
});
