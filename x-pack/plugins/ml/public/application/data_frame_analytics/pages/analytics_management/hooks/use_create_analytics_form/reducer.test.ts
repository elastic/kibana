/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { merge } from 'lodash';

import { ANALYSIS_CONFIG_TYPE, DataFrameAnalyticsConfig } from '../../../../common';

import { ACTION } from './actions';
import {
  reducer,
  validateAdvancedEditor,
  validateMinMML,
  validateNumTopFeatureImportanceValues,
} from './reducer';
import { getInitialState } from './state';

type SourceIndex = DataFrameAnalyticsConfig['source']['index'];

const getMockState = ({
  index,
  trainingPercent = 75,
  modelMemoryLimit = '100mb',
  numTopFeatureImportanceValues = 2,
}: {
  index: SourceIndex;
  trainingPercent?: number;
  modelMemoryLimit?: string;
  numTopFeatureImportanceValues?: number;
}) =>
  merge(getInitialState(), {
    form: {
      jobIdEmpty: false,
      jobIdValid: true,
      jobIdExists: false,
      createIndexPattern: false,
    },
    jobConfig: {
      source: { index },
      dest: { index: 'the-destination-index' },
      analysis: {
        classification: {
          dependent_variable: 'the-variable',
          num_top_feature_importance_values: numTopFeatureImportanceValues,
          training_percent: trainingPercent,
        },
      },
      model_memory_limit: modelMemoryLimit,
    },
  });

describe('useCreateAnalyticsForm', () => {
  test('reducer(): provide a minimum required valid job config, then reset.', () => {
    const initialState = getInitialState();
    expect(initialState.isValid).toBe(false);

    const stateWithEstimatedMml = reducer(initialState, {
      type: ACTION.SET_ESTIMATED_MODEL_MEMORY_LIMIT,
      value: '182222kb',
    });

    const updatedState = reducer(stateWithEstimatedMml, {
      type: ACTION.SET_FORM_STATE,
      payload: {
        destinationIndex: 'the-destination-index',
        jobId: 'the-analytics-job-id',
        sourceIndex: 'the-source-index',
        jobType: ANALYSIS_CONFIG_TYPE.OUTLIER_DETECTION,
        modelMemoryLimit: '200mb',
      },
    });
    expect(updatedState.isValid).toBe(true);

    const resettedState = reducer(updatedState, {
      type: ACTION.RESET_FORM,
    });
    expect(resettedState).toEqual(initialState);
  });

  test('reducer(): add/reset request messages', () => {
    const initialState = getInitialState();
    expect(initialState.requestMessages).toHaveLength(0);

    const requestMessageState = reducer(initialState, {
      type: ACTION.ADD_REQUEST_MESSAGE,
      requestMessage: {
        message: 'the-message',
      },
    });
    expect(requestMessageState.requestMessages).toHaveLength(1);

    const resetMessageState = reducer(requestMessageState, {
      type: ACTION.RESET_REQUEST_MESSAGES,
    });
    expect(resetMessageState.requestMessages).toHaveLength(0);
  });

  test('validateAdvancedEditor(): check index pattern variations', () => {
    // valid single index pattern
    expect(validateAdvancedEditor(getMockState({ index: 'the-source-index' })).isValid).toBe(true);
    // valid array with one ES index pattern
    expect(validateAdvancedEditor(getMockState({ index: ['the-source-index'] })).isValid).toBe(
      true
    );
    // valid array with two ES index patterns
    expect(
      validateAdvancedEditor(getMockState({ index: ['the-source-index-1', 'the-source-index-2'] }))
        .isValid
    ).toBe(true);
    // invalid comma-separated index pattern, this is only allowed in the simple form
    // but not the advanced editor.
    expect(
      validateAdvancedEditor(getMockState({ index: 'the-source-index-1,the-source-index-2' }))
        .isValid
    ).toBe(false);
    expect(
      validateAdvancedEditor(
        getMockState({ index: ['the-source-index-1,the-source-index-2', 'the-source-index-3'] })
      ).isValid
    ).toBe(false);
    // invalid formats ("fake" TS casting to get valid TS and be able to run the tests)
    expect(validateAdvancedEditor(getMockState({ index: {} as SourceIndex })).isValid).toBe(false);
    expect(
      validateAdvancedEditor(getMockState({ index: (undefined as unknown) as SourceIndex })).isValid
    ).toBe(false);
  });

  test('validateAdvancedEditor(): check model memory limit validation', () => {
    // valid model_memory_limit units
    expect(
      validateAdvancedEditor(getMockState({ index: 'the-source-index', modelMemoryLimit: '100mb' }))
        .isValid
    ).toBe(true);
    // invalid model_memory_limit units
    expect(
      validateAdvancedEditor(
        getMockState({ index: 'the-source-index', modelMemoryLimit: '100bob' })
      ).isValid
    ).toBe(false);
    // invalid model_memory_limit if empty
    expect(
      validateAdvancedEditor(getMockState({ index: 'the-source-index', modelMemoryLimit: '' }))
        .isValid
    ).toBe(false);
    // can still run validation check on model_memory_limit if number type
    expect(
      // @ts-ignore number is not assignable to type string - mml gets converted to string prior to creation
      validateAdvancedEditor(getMockState({ index: 'the-source-index', modelMemoryLimit: 100 }))
        .isValid
    ).toBe(false);
  });

  test('validateAdvancedEditor(): check training percent validation', () => {
    // valid training_percent value
    expect(
      validateAdvancedEditor(getMockState({ index: 'the-source-index', trainingPercent: 75 }))
        .isValid
    ).toBe(true);
    // invalid training_percent numeric value
    expect(
      validateAdvancedEditor(getMockState({ index: 'the-source-index', trainingPercent: 102 }))
        .isValid
    ).toBe(false);
    // invalid training_percent numeric value if 0
    expect(
      validateAdvancedEditor(getMockState({ index: 'the-source-index', trainingPercent: 0 }))
        .isValid
    ).toBe(false);
  });

  test('validateAdvancedEditor(): check num_top_feature_importance_values validation', () => {
    // valid num_top_feature_importance_values value
    expect(
      validateAdvancedEditor(
        getMockState({ index: 'the-source-index', numTopFeatureImportanceValues: 1 })
      ).isValid
    ).toBe(true);
    // invalid num_top_feature_importance_values numeric value
    expect(
      validateAdvancedEditor(
        getMockState({ index: 'the-source-index', numTopFeatureImportanceValues: -1 })
      ).isValid
    ).toBe(false);
    // invalid training_percent numeric value if not an integer
    expect(
      validateAdvancedEditor(
        getMockState({ index: 'the-source-index', numTopFeatureImportanceValues: 1.1 })
      ).isValid
    ).toBe(false);
  });
});

describe('validateMinMML', () => {
  test('should detect a lower value', () => {
    expect(validateMinMML('10mb')('100kb')).toEqual({
      min: { minValue: '10mb', actualValue: '100kb' },
    });
  });

  test('should allow a bigger value', () => {
    expect(validateMinMML('10mb')('1GB')).toEqual(null);
  });

  test('should allow the same value', () => {
    expect(validateMinMML('1024mb')('1gb')).toEqual(null);
  });

  test('should ignore empty parameters', () => {
    expect(validateMinMML((undefined as unknown) as string)('')).toEqual(null);
  });
});

describe('validateNumTopFeatureImportanceValues()', () => {
  test('should not allow below 0', () => {
    expect(validateNumTopFeatureImportanceValues(-1)).toBe(false);
  });

  test('should not allow strings', () => {
    expect(validateNumTopFeatureImportanceValues('1')).toBe(false);
  });

  test('should not allow floats', () => {
    expect(validateNumTopFeatureImportanceValues(0.1)).toBe(false);
    expect(validateNumTopFeatureImportanceValues(1.1)).toBe(false);
    expect(validateNumTopFeatureImportanceValues(-1.1)).toBe(false);
  });

  test('should allow 0 and higher', () => {
    expect(validateNumTopFeatureImportanceValues(0)).toBe(true);
    expect(validateNumTopFeatureImportanceValues(1)).toBe(true);
  });
});
