/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../../../__mocks__/kea_logic';

import { HttpError } from '../../../../../../../common/types/api';
import { MlModelDeploymentState } from '../../../../../../../common/types/ml';
import { CachedFetchModelsApiLogic } from '../../../../api/ml_models/cached_fetch_models_api_logic';
import {
  CreateModelApiLogic,
  CreateModelResponse,
} from '../../../../api/ml_models/create_model_api_logic';
import { StartModelApiLogic } from '../../../../api/ml_models/start_model_api_logic';

import { ModelSelectLogic } from './model_select_logic';

const CREATE_MODEL_API_RESPONSE: CreateModelResponse = {
  modelId: 'model_1',
  deploymentState: MlModelDeploymentState.NotDeployed,
};

describe('ModelSelectLogic', () => {
  const { mount } = new LogicMounter(ModelSelectLogic);
  const { mount: mountCreateModelApiLogic } = new LogicMounter(CreateModelApiLogic);
  const { mount: mountStartModelApiLogic } = new LogicMounter(StartModelApiLogic);

  beforeEach(() => {
    jest.clearAllMocks();
    mountCreateModelApiLogic();
    mountStartModelApiLogic();
    mount();
  });

  describe('listeners', () => {
    describe('createModel', () => {
      it('creates the model', () => {
        const modelId = 'model_1';
        jest.spyOn(ModelSelectLogic.actions, 'createModelMakeRequest');

        ModelSelectLogic.actions.createModel(modelId);

        expect(ModelSelectLogic.actions.createModelMakeRequest).toHaveBeenCalledWith({ modelId });
      });
    });

    describe('createModelSuccess', () => {
      it('starts polling models', () => {
        jest.spyOn(ModelSelectLogic.actions, 'startPollingModels');

        ModelSelectLogic.actions.createModelSuccess(CREATE_MODEL_API_RESPONSE);

        expect(ModelSelectLogic.actions.startPollingModels).toHaveBeenCalled();
      });
      it('sets selected model as non-placeholder', () => {
        jest.spyOn(ModelSelectLogic.actions, 'clearModelPlaceholderFlag');

        ModelSelectLogic.actions.createModelSuccess(CREATE_MODEL_API_RESPONSE);

        expect(ModelSelectLogic.actions.clearModelPlaceholderFlag).toHaveBeenCalledWith(
          CREATE_MODEL_API_RESPONSE.modelId
        );
      });
    });

    describe('startModel', () => {
      it('makes start model request', () => {
        const modelId = 'model_1';
        jest.spyOn(ModelSelectLogic.actions, 'startModelMakeRequest');

        ModelSelectLogic.actions.startModel(modelId);

        expect(ModelSelectLogic.actions.startModelMakeRequest).toHaveBeenCalledWith({ modelId });
      });
    });

    describe('startModelSuccess', () => {
      it('starts polling models', () => {
        jest.spyOn(ModelSelectLogic.actions, 'startPollingModels');

        ModelSelectLogic.actions.startModelSuccess(CREATE_MODEL_API_RESPONSE);

        expect(ModelSelectLogic.actions.startPollingModels).toHaveBeenCalled();
      });
    });
  });

  describe('selectors', () => {
    describe('areActionButtonsDisabled', () => {
      it('is set to false if create and start APIs are idle', () => {
        CreateModelApiLogic.actions.apiReset();
        StartModelApiLogic.actions.apiReset();

        expect(ModelSelectLogic.values.areActionButtonsDisabled).toBe(false);
      });
      it('is set to true if create API is making a request', () => {
        CreateModelApiLogic.actions.makeRequest({ modelId: 'model_1' });

        expect(ModelSelectLogic.values.areActionButtonsDisabled).toBe(true);
      });
      it('is set to true if start API is making a request', () => {
        StartModelApiLogic.actions.makeRequest({ modelId: 'model_1' });

        expect(ModelSelectLogic.values.areActionButtonsDisabled).toBe(true);
      });
    });

    describe('modelStateChangeError', () => {
      it('gets error from API error response', () => {
        const error = {
          body: {
            error: 'some-error',
            message: 'some-error-message',
            statusCode: 500,
          },
        } as HttpError;

        StartModelApiLogic.actions.apiError(error);

        expect(ModelSelectLogic.values.modelStateChangeError).toEqual('some-error-message');
      });
    });

    describe('isLoading', () => {
      it('is set to true if the fetch API is loading the first time', () => {
        CachedFetchModelsApiLogic.actions.apiReset();

        expect(ModelSelectLogic.values.isLoading).toBe(true);
      });
    });
  });
});
