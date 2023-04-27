/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../../../__mocks__/kea_logic';

import { HttpResponse } from '@kbn/core/public';

import { ErrorResponse, Status } from '../../../../../../../common/types/api';
import { MlModelDeploymentState } from '../../../../../../../common/types/ml';
import { CreateTextExpansionModelApiLogic } from '../../../../api/ml_models/text_expansion/create_text_expansion_model_api_logic';
import { FetchTextExpansionModelApiLogic } from '../../../../api/ml_models/text_expansion/fetch_text_expansion_model_api_logic';

import {
  TextExpansionCalloutLogic,
  TextExpansionCalloutValues,
} from './text_expansion_callout_logic';

const DEFAULT_VALUES: TextExpansionCalloutValues = {
  createTextExpansionModelStatus: Status.IDLE,
  createdTextExpansionModel: undefined,
  isCreateButtonDisabled: false,
  isModelDownloadInProgress: false,
  isModelDownloaded: false,
  isPollingTextExpansionModelActive: false,
  textExpansionModel: undefined,
  textExpansionModelPollTimeoutId: null,
};

jest.useFakeTimers();

describe('TextExpansionCalloutLogic', () => {
  const { mount } = new LogicMounter(TextExpansionCalloutLogic);
  const { mount: mountCreateTextExpansionModelApiLogic } = new LogicMounter(
    CreateTextExpansionModelApiLogic
  );
  const { mount: mountFetchTextExpansionModelApiLogic } = new LogicMounter(
    FetchTextExpansionModelApiLogic
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mountCreateTextExpansionModelApiLogic();
    mountFetchTextExpansionModelApiLogic();
    mount();
  });

  it('has expected default values', () => {
    expect(TextExpansionCalloutLogic.values).toEqual(DEFAULT_VALUES);
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

    describe('createTextExpansionModelSuccess', () => {
      it('sets createdTextExpansionModel', () => {
        jest.spyOn(TextExpansionCalloutLogic.actions, 'fetchTextExpansionModel');
        jest.spyOn(TextExpansionCalloutLogic.actions, 'startPollingTextExpansionModel');

        TextExpansionCalloutLogic.actions.createTextExpansionModelSuccess({
          deploymentState: MlModelDeploymentState.Downloading,
          modelId: 'mock-model-id',
        });

        expect(TextExpansionCalloutLogic.actions.fetchTextExpansionModel).toHaveBeenCalled();
        expect(TextExpansionCalloutLogic.actions.startPollingTextExpansionModel).toHaveBeenCalled();
      });
    });

    describe('fetchTextExpansionModelSuccess', () => {
      const data = {
        deploymentState: MlModelDeploymentState.Downloading,
        modelId: 'mock-model-id',
      };

      it('starts polling when the model is downloading and polling is not active', () => {
        mount({
          ...DEFAULT_VALUES,
        });
        jest.spyOn(TextExpansionCalloutLogic.actions, 'startPollingTextExpansionModel');

        TextExpansionCalloutLogic.actions.fetchTextExpansionModelSuccess(data);

        expect(TextExpansionCalloutLogic.actions.startPollingTextExpansionModel).toHaveBeenCalled();
      });
      it('sets polling timeout when the model is downloading and polling is active', () => {
        mount({
          ...DEFAULT_VALUES,
          textExpansionModelPollTimeoutId: 'timeout-id',
        });
        jest.spyOn(TextExpansionCalloutLogic.actions, 'createTextExpansionModelPollingTimeout');

        TextExpansionCalloutLogic.actions.fetchTextExpansionModelSuccess(data);

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

        TextExpansionCalloutLogic.actions.fetchTextExpansionModelSuccess({
          deploymentState: MlModelDeploymentState.Downloaded,
          modelId: 'mock-model-id',
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

        TextExpansionCalloutLogic.actions.fetchTextExpansionModelError({
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
        CreateTextExpansionModelApiLogic.actions.apiReset();
        expect(TextExpansionCalloutLogic.values.isCreateButtonDisabled).toBe(false);
      });
      it('is set to true if the fetch model API is not idle', () => {
        CreateTextExpansionModelApiLogic.actions.apiSuccess({
          deploymentState: MlModelDeploymentState.Downloading,
          modelId: 'mock-model-id',
        });
        expect(TextExpansionCalloutLogic.values.isCreateButtonDisabled).toBe(true);
      });
    });

    describe('isModelDownloadInProgress', () => {
      it('is set to true if the model is downloading', () => {
        FetchTextExpansionModelApiLogic.actions.apiSuccess({
          deploymentState: MlModelDeploymentState.Downloading,
          modelId: 'mock-model-id',
        });
        expect(TextExpansionCalloutLogic.values.isModelDownloadInProgress).toBe(true);
      });
      it('is set to false if the model is downloading', () => {
        FetchTextExpansionModelApiLogic.actions.apiSuccess({
          deploymentState: MlModelDeploymentState.Started,
          modelId: 'mock-model-id',
        });
        expect(TextExpansionCalloutLogic.values.isModelDownloadInProgress).toBe(false);
      });
    });

    describe('isModelDownloaded', () => {
      it('is set to true if the model is downloaded', () => {
        FetchTextExpansionModelApiLogic.actions.apiSuccess({
          deploymentState: MlModelDeploymentState.Downloaded,
          modelId: 'mock-model-id',
        });
        expect(TextExpansionCalloutLogic.values.isModelDownloaded).toBe(true);
      });
      it('is set to false if the model is not downloaded', () => {
        FetchTextExpansionModelApiLogic.actions.apiSuccess({
          deploymentState: MlModelDeploymentState.NotDeployed,
          modelId: 'mock-model-id',
        });
        expect(TextExpansionCalloutLogic.values.isModelDownloaded).toBe(false);
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
