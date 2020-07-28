/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getCloneFormStateFromJobConfig,
  getInitialState,
  getJobConfigFromFormState,
} from './state';

const regJobConfig = {
  id: 'reg-test-01',
  description: 'Reg test job description',
  source: {
    index: ['reg-test-index'],
    query: {
      match_all: {},
    },
  },
  dest: {
    index: 'reg-test-01-index',
    results_field: 'ml',
  },
  analysis: {
    regression: {
      dependent_variable: 'price',
      num_top_feature_importance_values: 2,
      prediction_field_name: 'airbnb_test',
      training_percent: 5,
      randomize_seed: 4998776294664380000,
    },
  },
  analyzed_fields: {
    includes: [],
    excludes: [],
  },
  model_memory_limit: '22mb',
  create_time: 1590514291395,
  version: '8.0.0',
  allow_lazy_start: false,
};

const outlierJobConfig = {
  id: 'outlier-test-01',
  description: 'outlier test job description',
  source: {
    index: ['outlier-test-index'],
    query: {
      match_all: {},
    },
  },
  dest: {
    index: 'outlier-test-01-index',
    results_field: 'ml',
  },
  analysis: {
    outlier_detection: {
      feature_influence_threshold: 0.01,
      outlier_fraction: 0.05,
      compute_feature_influence: false,
      method: 'lof',
    },
  },
  analyzed_fields: {
    includes: ['field', 'other_field'],
    excludes: [],
  },
  model_memory_limit: '22mb',
  create_time: 1590514291395,
  version: '8.0.0',
  allow_lazy_start: false,
};

describe('useCreateAnalyticsForm', () => {
  test('state: getJobConfigFromFormState()', () => {
    const state = getInitialState();

    state.form.destinationIndex = 'the-destination-index';
    state.form.sourceIndex = 'the-source-index';

    const jobConfig = getJobConfigFromFormState(state.form);

    expect(jobConfig?.dest?.index).toBe('the-destination-index');
    expect(jobConfig?.source?.index).toBe('the-source-index');
    expect(jobConfig?.analyzed_fields?.includes).toStrictEqual([]);
    expect(typeof jobConfig?.analyzed_fields?.excludes).toBe('undefined');

    // test the conversion of comma-separated Kibana index patterns to ES array based index patterns
    state.form.sourceIndex = 'the-source-index-1,the-source-index-2';
    const jobConfigSourceIndexArray = getJobConfigFromFormState(state.form);
    expect(jobConfigSourceIndexArray?.source?.index).toStrictEqual([
      'the-source-index-1',
      'the-source-index-2',
    ]);
  });

  test('state: getCloneFormStateFromJobConfig() regression', () => {
    const clonedState = getCloneFormStateFromJobConfig(regJobConfig);

    expect(clonedState?.sourceIndex).toBe('reg-test-index');
    expect(clonedState?.includes).toStrictEqual([]);
    expect(clonedState?.dependentVariable).toBe('price');
    expect(clonedState?.numTopFeatureImportanceValues).toBe(2);
    expect(clonedState?.predictionFieldName).toBe('airbnb_test');
    expect(clonedState?.trainingPercent).toBe(5);
    expect(clonedState?.randomizeSeed).toBe(4998776294664380000);
    expect(clonedState?.modelMemoryLimit).toBe('22mb');
    // destination index and job id should be undefined
    expect(clonedState?.destinationIndex).toBe(undefined);
    expect(clonedState?.jobId).toBe(undefined);
  });

  test('state: getCloneFormStateFromJobConfig() outlier detection', () => {
    const clonedState = getCloneFormStateFromJobConfig(outlierJobConfig);

    expect(clonedState?.sourceIndex).toBe('outlier-test-index');
    expect(clonedState?.includes).toStrictEqual(['field', 'other_field']);
    expect(clonedState?.featureInfluenceThreshold).toBe(0.01);
    expect(clonedState?.outlierFraction).toBe(0.05);
    expect(clonedState?.computeFeatureInfluence).toBe(false);
    expect(clonedState?.method).toBe('lof');
    expect(clonedState?.modelMemoryLimit).toBe('22mb');
    // destination index and job id should be undefined
    expect(clonedState?.destinationIndex).toBe(undefined);
    expect(clonedState?.jobId).toBe(undefined);
  });
});
