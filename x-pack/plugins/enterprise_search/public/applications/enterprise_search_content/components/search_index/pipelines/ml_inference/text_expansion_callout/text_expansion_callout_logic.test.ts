/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../../../../__mocks__/kea_logic';

import { HttpResponse } from '@kbn/core/public';

import { ErrorResponse, HttpError, Status } from '../../../../../../../../common/types/api';
import {
  MlModelDeploymentState,
  MlModelDeploymentStatus,
} from '../../../../../../../../common/types/ml';
import { CreateModelApiLogic } from '../../../../../api/ml_models/create_model_api_logic';
import { FetchModelApiLogic } from '../../../../../api/ml_models/fetch_model_api_logic';
import { StartModelApiLogic } from '../../../../../api/ml_models/start_model_api_logic';

import {
  getTextExpansionError,
  TextExpansionCalloutLogic,
  TextExpansionCalloutValues,
} from './text_expansion_callout_logic';

const DEFAULT_VALUES: TextExpansionCalloutValues = {
  createModelError: undefined,
  createModelStatus: Status.IDLE,
  createdModel: undefined,
  fetchModelError: undefined,
  isCreateButtonDisabled: false,
  isModelDownloadInProgress: false,
  isModelDownloaded: false,
  isModelRunningSingleThreaded: false,
  isModelStarted: false,
  isPollingTextExpansionModelActive: false,
  isStartButtonDisabled: false,
  startModelError: undefined,
  startModelStatus: Status.IDLE,
  textExpansionModel: undefined,
  textExpansionModelPollTimeoutId: null,
  textExpansionError: null,
  elserModelId: '.elser_model_2',
};

const DEFAULT_MODEL_STATUS: MlModelDeploymentStatus = {
  deploymentState: MlModelDeploymentState.NotDeployed,
  modelId: 'mock-model-id',
  targetAllocationCount: 1,
  nodeAllocationCount: 1,
  threadsPerAllocation: 1,
  startTime: 123456,
};

jest.useFakeTimers();

describe('TextExpansionCalloutLogic', () => {
  const { mount } = new LogicMounter(TextExpansionCalloutLogic);
  const { mount: mountCreateModelApiLogic } = new LogicMounter(CreateModelApiLogic);
  const { mount: mountFetchTextExpansionModelApiLogic } = new LogicMounter(FetchModelApiLogic);
  const { mount: mountStartModelApiLogic } = new LogicMounter(StartModelApiLogic);

  beforeEach(() => {
    jest.clearAllMocks();
    mountCreateModelApiLogic();
    mountFetchTextExpansionModelApiLogic();
    mountStartModelApiLogic();
    mount();
  });

  it('has expected default values', () => {
    expect(TextExpansionCalloutLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('getTextExpansionError', () => {
    const error = {
      body: {
        error: 'some-error',
        message: 'some-error-message',
        statusCode: 500,
      },
    } as HttpError;
    it('returns null if there is no error', () => {
      expect(getTextExpansionError(undefined, undefined, undefined)).toBe(null);
    });
    it('uses the correct title and message from a create error', () => {
      expect(getTextExpansionError(error, undefined, undefined)).toEqual({
        title: 'Error with ELSER deployment',
        message: error.body?.message,
      });
    });
    it('uses the correct title and message from a fetch error', () => {
      expect(getTextExpansionError(undefined, error, undefined)).toEqual({
        title: 'Error fetching ELSER model',
        message: error.body?.message,
      });
    });
    it('uses the correct title and message from a start error', () => {
      expect(getTextExpansionError(undefined, undefined, error)).toEqual({
        title: 'Error starting ELSER deployment',
        message: error.body?.message,
      });
    });
  });

  describe('listeners', () => {
    describe('createTextExpansionModelPollingTimeout', () => {
      const duration = 5000;
      it('sets polling timeout', () => {
        jest.spyOn(global, 'setTimeout');
        jest.spyOn(TextExpansionCalloutLogic.actions, 'setTextExpansionModelPollingId');

        TextExpansionCalloutLogic.actions.createTextExpansionModelPollingTimeout(duration);

        expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), duration);
        expect(TextExpansionCalloutLogic.actions.setTextExpansionModelPollingId).toHaveBeenCalled();
      });
      it('clears polling timeout if it is set', () => {
        mount({
          ...DEFAULT_VALUES,
          textExpansionModelPollTimeoutId: 'timeout-id',
        });

        jest.spyOn(global, 'clearTimeout');

        TextExpansionCalloutLogic.actions.createTextExpansionModelPollingTimeout(duration);

        expect(clearTimeout).toHaveBeenCalledWith('timeout-id');
      });
    });

    describe('createModelSuccess', () => {
      it('sets createdModel', () => {
        jest.spyOn(TextExpansionCalloutLogic.actions, 'fetchTextExpansionModel');
        jest.spyOn(TextExpansionCalloutLogic.actions, 'startPollingTextExpansionModel');

        TextExpansionCalloutLogic.actions.createModelSuccess({
          deploymentState: MlModelDeploymentState.Downloading,
          modelId: 'mock-model-id',
        });

        expect(TextExpansionCalloutLogic.actions.fetchTextExpansionModel).toHaveBeenCalled();
        expect(TextExpansionCalloutLogic.actions.startPollingTextExpansionModel).toHaveBeenCalled();
      });
    });

    describe('fetchTextExpansionModelSuccess', () => {
      it('starts polling when the model is downloading and polling is not active', () => {
        mount({
          ...DEFAULT_VALUES,
        });
        jest.spyOn(TextExpansionCalloutLogic.actions, 'startPollingTextExpansionModel');

        TextExpansionCalloutLogic.actions.fetchModelSuccess({
          ...DEFAULT_MODEL_STATUS,
          deploymentState: MlModelDeploymentState.Downloading,
        });

        expect(TextExpansionCalloutLogic.actions.startPollingTextExpansionModel).toHaveBeenCalled();
      });
      it('sets polling timeout when the model is downloading and polling is active', () => {
        mount({
          ...DEFAULT_VALUES,
          textExpansionModelPollTimeoutId: 'timeout-id',
        });
        jest.spyOn(TextExpansionCalloutLogic.actions, 'createTextExpansionModelPollingTimeout');

        TextExpansionCalloutLogic.actions.fetchModelSuccess({
          ...DEFAULT_MODEL_STATUS,
          deploymentState: MlModelDeploymentState.Downloading,
        });

        expect(
          TextExpansionCalloutLogic.actions.createTextExpansionModelPollingTimeout
        ).toHaveBeenCalled();
      });
      it('stops polling when the model is downloaded and polling is active', () => {
        mount({
          ...DEFAULT_VALUES,
          textExpansionModelPollTimeoutId: 'timeout-id',
        });
        jest.spyOn(TextExpansionCalloutLogic.actions, 'stopPollingTextExpansionModel');

        TextExpansionCalloutLogic.actions.fetchModelSuccess({
          ...DEFAULT_MODEL_STATUS,
          deploymentState: MlModelDeploymentState.Downloaded,
        });

        expect(TextExpansionCalloutLogic.actions.stopPollingTextExpansionModel).toHaveBeenCalled();
      });
    });

    describe('fetchTextExpansionModelError', () => {
      it('stops polling if it is active', () => {
        mount({
          ...DEFAULT_VALUES,
          textExpansionModelPollTimeoutId: 'timeout-id',
        });
        jest.spyOn(TextExpansionCalloutLogic.actions, 'createTextExpansionModelPollingTimeout');

        TextExpansionCalloutLogic.actions.fetchModelError({
          body: {
            error: '',
            message: 'some error',
            statusCode: 500,
          },
        } as HttpResponse<ErrorResponse>);

        expect(
          TextExpansionCalloutLogic.actions.createTextExpansionModelPollingTimeout
        ).toHaveBeenCalled();
      });
    });

    describe('startPollingTextExpansionModel', () => {
      it('sets polling timeout', () => {
        jest.spyOn(TextExpansionCalloutLogic.actions, 'createTextExpansionModelPollingTimeout');

        TextExpansionCalloutLogic.actions.startPollingTextExpansionModel();

        expect(
          TextExpansionCalloutLogic.actions.createTextExpansionModelPollingTimeout
        ).toHaveBeenCalled();
      });
      it('clears polling timeout if it is set', () => {
        mount({
          ...DEFAULT_VALUES,
          textExpansionModelPollTimeoutId: 'timeout-id',
        });

        jest.spyOn(global, 'clearTimeout');

        TextExpansionCalloutLogic.actions.startPollingTextExpansionModel();

        expect(clearTimeout).toHaveBeenCalledWith('timeout-id');
      });
    });

    describe('startTextExpansionModelSuccess', () => {
      it('sets startedTextExpansionModel', () => {
        jest.spyOn(TextExpansionCalloutLogic.actions, 'fetchTextExpansionModel');

        TextExpansionCalloutLogic.actions.startModelSuccess({
          deploymentState: MlModelDeploymentState.FullyAllocated,
          modelId: 'mock-model-id',
        });

        expect(TextExpansionCalloutLogic.actions.fetchTextExpansionModel).toHaveBeenCalled();
      });
    });

    describe('stopPollingTextExpansionModel', () => {
      it('clears polling timeout and poll timeout ID if it is set', () => {
        mount({
          ...DEFAULT_VALUES,
          textExpansionModelPollTimeoutId: 'timeout-id',
        });

        jest.spyOn(global, 'clearTimeout');
        jest.spyOn(TextExpansionCalloutLogic.actions, 'clearTextExpansionModelPollingId');

        TextExpansionCalloutLogic.actions.stopPollingTextExpansionModel();

        expect(clearTimeout).toHaveBeenCalledWith('timeout-id');
        expect(
          TextExpansionCalloutLogic.actions.clearTextExpansionModelPollingId
        ).toHaveBeenCalled();
      });
    });
  });

  describe('reducers', () => {
    describe('textExpansionModelPollTimeoutId', () => {
      it('gets cleared on clearTextExpansionModelPollingId', () => {
        TextExpansionCalloutLogic.actions.clearTextExpansionModelPollingId();

        expect(TextExpansionCalloutLogic.values.textExpansionModelPollTimeoutId).toBe(null);
      });
      it('gets set on setTextExpansionModelPollingId', () => {
        const timeout = setTimeout(() => {}, 500);
        TextExpansionCalloutLogic.actions.setTextExpansionModelPollingId(timeout);

        expect(TextExpansionCalloutLogic.values.textExpansionModelPollTimeoutId).toEqual(timeout);
      });
    });
  });

  describe('selectors', () => {
    describe('isCreateButtonDisabled', () => {
      it('is set to false if the fetch model API is idle', () => {
        CreateModelApiLogic.actions.apiReset();
        expect(TextExpansionCalloutLogic.values.isCreateButtonDisabled).toBe(false);
      });
      it('is set to true if the fetch model API is not idle', () => {
        CreateModelApiLogic.actions.apiSuccess({
          deploymentState: MlModelDeploymentState.Downloading,
          modelId: 'mock-model-id',
        });
        expect(TextExpansionCalloutLogic.values.isCreateButtonDisabled).toBe(true);
      });
    });

    describe('textExpansionError', () => {
      const error = {
        body: {
          error: 'Error with ELSER deployment',
          message: 'Mocked error message',
          statusCode: 500,
        },
      } as HttpError;

      it('returns null when there are no errors', () => {
        CreateModelApiLogic.actions.apiReset();
        FetchModelApiLogic.actions.apiReset();
        StartModelApiLogic.actions.apiReset();
        expect(TextExpansionCalloutLogic.values.textExpansionError).toBe(null);
      });
      it('returns extracted error for create', () => {
        CreateModelApiLogic.actions.apiError(error);
        expect(TextExpansionCalloutLogic.values.textExpansionError).toStrictEqual({
          title: 'Error with ELSER deployment',
          message: 'Mocked error message',
        });
      });
      it('returns extracted error for fetch', () => {
        FetchModelApiLogic.actions.apiError(error);
        expect(TextExpansionCalloutLogic.values.textExpansionError).toStrictEqual({
          title: 'Error fetching ELSER model',
          message: 'Mocked error message',
        });
      });
      it('returns extracted error for start', () => {
        StartModelApiLogic.actions.apiError(error);
        expect(TextExpansionCalloutLogic.values.textExpansionError).toStrictEqual({
          title: 'Error starting ELSER deployment',
          message: 'Mocked error message',
        });
      });
    });

    describe('isModelDownloadInProgress', () => {
      it('is set to true if the model is downloading', () => {
        FetchModelApiLogic.actions.apiSuccess({
          ...DEFAULT_MODEL_STATUS,
          deploymentState: MlModelDeploymentState.Downloading,
        });
        expect(TextExpansionCalloutLogic.values.isModelDownloadInProgress).toBe(true);
      });
      it('is set to false if the model is downloading', () => {
        FetchModelApiLogic.actions.apiSuccess({
          ...DEFAULT_MODEL_STATUS,
          deploymentState: MlModelDeploymentState.Started,
        });
        expect(TextExpansionCalloutLogic.values.isModelDownloadInProgress).toBe(false);
      });
    });

    describe('isModelDownloaded', () => {
      it('is set to true if the model is downloaded', () => {
        FetchModelApiLogic.actions.apiSuccess({
          ...DEFAULT_MODEL_STATUS,
          deploymentState: MlModelDeploymentState.Downloaded,
        });
        expect(TextExpansionCalloutLogic.values.isModelDownloaded).toBe(true);
      });
      it('is set to false if the model is not downloaded', () => {
        FetchModelApiLogic.actions.apiSuccess(DEFAULT_MODEL_STATUS);
        expect(TextExpansionCalloutLogic.values.isModelDownloaded).toBe(false);
      });
    });

    describe('isModelRunningSingleThreaded', () => {
      it('is set to true if the model has 1 target allocation and 1 thread', () => {
        FetchModelApiLogic.actions.apiSuccess({
          ...DEFAULT_MODEL_STATUS,
          deploymentState: MlModelDeploymentState.FullyAllocated,
        });
        expect(TextExpansionCalloutLogic.values.isModelRunningSingleThreaded).toBe(true);
      });
      it('is set to false if the model has multiple target allocations', () => {
        FetchModelApiLogic.actions.apiSuccess({
          ...DEFAULT_MODEL_STATUS,
          deploymentState: MlModelDeploymentState.FullyAllocated,
          targetAllocationCount: 2,
          nodeAllocationCount: 2,
        });
        expect(TextExpansionCalloutLogic.values.isModelRunningSingleThreaded).toBe(false);
      });
      it('is set to false if the model runs on multiple threads', () => {
        FetchModelApiLogic.actions.apiSuccess({
          ...DEFAULT_MODEL_STATUS,
          deploymentState: MlModelDeploymentState.FullyAllocated,
          threadsPerAllocation: 4,
        });
        expect(TextExpansionCalloutLogic.values.isModelRunningSingleThreaded).toBe(false);
      });
    });

    describe('isModelStarted', () => {
      it('is set to true if the model is started', () => {
        FetchModelApiLogic.actions.apiSuccess({
          ...DEFAULT_MODEL_STATUS,
          deploymentState: MlModelDeploymentState.FullyAllocated,
        });
        expect(TextExpansionCalloutLogic.values.isModelStarted).toBe(true);
      });
      it('is set to false if the model is not started', () => {
        FetchModelApiLogic.actions.apiSuccess(DEFAULT_MODEL_STATUS);
        expect(TextExpansionCalloutLogic.values.isModelStarted).toBe(false);
      });
    });

    describe('isPollingTextExpansionModelActive', () => {
      it('is set to false if polling is not active', () => {
        mount({
          ...DEFAULT_VALUES,
          textExpansionModelPollTimeoutId: null,
        });

        expect(TextExpansionCalloutLogic.values.isPollingTextExpansionModelActive).toBe(false);
      });
      it('is set to true if polling is active', () => {
        mount({
          ...DEFAULT_VALUES,
          textExpansionModelPollTimeoutId: 'timeout-id',
        });

        expect(TextExpansionCalloutLogic.values.isPollingTextExpansionModelActive).toBe(true);
      });
    });
  });
});
