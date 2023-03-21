/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { LogicMounter } from '../../../../__mocks__/kea_logic';

import { Status } from '../../../../../../common/types/api';
import { FetchMlInferenceErrorsApiLogic } from '../../../api/pipelines/fetch_ml_inference_pipeline_errors';

import { InferenceErrorsLogic } from './inference_errors_logic';

const DEFAULT_VALUES = {
  fetchIndexInferenceHistoryStatus: Status.IDLE,
  indexName: '',
  inferenceErrors: [],
  inferenceErrorsData: undefined,
  isLoading: true,
};

describe('InferenceErrorsLogic', () => {
  const { mount } = new LogicMounter(InferenceErrorsLogic);
  const { mount: mountFetchInferenceErrorsApiLogic } = new LogicMounter(
    FetchMlInferenceErrorsApiLogic
  );
  beforeEach(() => {
    jest.clearAllMocks();
    mountFetchInferenceErrorsApiLogic();
    mount();
  });

  it('has expected default values', () => {
    expect(InferenceErrorsLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    it('should load fetched errors', () => {
      const inferenceErrorsData = {
        errors: [
          {
            doc_count: 10,
            message: 'I am a stick!',
            timestamp: '1999-12-31T23:59:59.999Z',
          },
        ],
      };
      FetchMlInferenceErrorsApiLogic.actions.apiSuccess(inferenceErrorsData);
      expect(InferenceErrorsLogic.values).toEqual({
        ...DEFAULT_VALUES,
        fetchIndexInferenceHistoryStatus: Status.SUCCESS,
        inferenceErrors: inferenceErrorsData.errors,
        inferenceErrorsData,
        isLoading: false,
      });
    });
  });
});
