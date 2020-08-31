/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TransformPivotConfig } from '../../../../common';

import {
  applyFormFieldsToTransformConfig,
  formReducerFactory,
  frequencyValidator,
  getDefaultState,
  numberAboveZeroValidator,
  FormField,
} from './use_edit_transform_flyout';

const getTransformConfigMock = (): TransformPivotConfig => ({
  id: 'the-transform-id',
  source: {
    index: ['the-transform-source-index'],
    query: {
      match_all: {},
    },
  },
  dest: {
    index: 'the-transform-destination-index',
  },
  pivot: {
    group_by: {
      airline: {
        terms: {
          field: 'airline',
        },
      },
    },
    aggregations: {
      'responsetime.avg': {
        avg: {
          field: 'responsetime',
        },
      },
    },
  },
  description: 'the-description',
});

const getDescriptionFieldMock = (value = ''): FormField => ({
  isOptional: true,
  value,
  errorMessages: [],
  validator: 'string',
});

const getDocsPerSecondFieldMock = (value = ''): FormField => ({
  isOptional: true,
  value,
  errorMessages: [],
  validator: 'numberAboveZero',
});

const getFrequencyFieldMock = (value = ''): FormField => ({
  isOptional: true,
  value,
  errorMessages: [],
  validator: 'frequency',
});

describe('Transform: applyFormFieldsToTransformConfig()', () => {
  test('should exclude unchanged form fields', () => {
    const transformConfigMock = getTransformConfigMock();

    const updateConfig = applyFormFieldsToTransformConfig(transformConfigMock, {
      description: getDescriptionFieldMock(transformConfigMock.description),
      docsPerSecond: getDocsPerSecondFieldMock(),
      frequency: getFrequencyFieldMock(),
    });

    // This case will return an empty object. In the actual UI, this case should not happen
    // because the Update-Button will be disabled when no form field was changed.
    expect(Object.keys(updateConfig)).toHaveLength(0);
    expect(updateConfig.description).toBe(undefined);
    // `docs_per_second` is nested under `settings` so we're just checking against that.
    expect(updateConfig.settings).toBe(undefined);
    expect(updateConfig.frequency).toBe(undefined);
  });

  test('should include previously nonexisting attributes', () => {
    const transformConfigMock = getTransformConfigMock();
    delete transformConfigMock.description;
    delete transformConfigMock.frequency;

    const updateConfig = applyFormFieldsToTransformConfig(transformConfigMock, {
      description: getDescriptionFieldMock('the-new-description'),
      docsPerSecond: getDocsPerSecondFieldMock('10'),
      frequency: getFrequencyFieldMock('1m'),
    });

    expect(Object.keys(updateConfig)).toHaveLength(3);
    expect(updateConfig.description).toBe('the-new-description');
    expect(updateConfig.settings?.docs_per_second).toBe(10);
    expect(updateConfig.frequency).toBe('1m');
  });

  test('should only include changed form fields', () => {
    const transformConfigMock = getTransformConfigMock();
    const updateConfig = applyFormFieldsToTransformConfig(transformConfigMock, {
      description: getDescriptionFieldMock('the-updated-description'),
      docsPerSecond: getDocsPerSecondFieldMock(),
      frequency: getFrequencyFieldMock(),
    });

    expect(Object.keys(updateConfig)).toHaveLength(1);
    expect(updateConfig.description).toBe('the-updated-description');
    // `docs_per_second` is nested under `settings` so we're just checking against that.
    expect(updateConfig.settings).toBe(undefined);
    expect(updateConfig.frequency).toBe(undefined);
  });
});

describe('Transform: formReducerFactory()', () => {
  test('field updates should trigger form validation', () => {
    const transformConfigMock = getTransformConfigMock();
    const reducer = formReducerFactory(transformConfigMock);

    const state1 = reducer(getDefaultState(transformConfigMock), {
      field: 'description',
      value: 'the-updated-description',
    });

    expect(state1.isFormTouched).toBe(true);
    expect(state1.isFormValid).toBe(true);

    const state2 = reducer(state1, {
      field: 'description',
      value: transformConfigMock.description as string,
    });

    expect(state2.isFormTouched).toBe(false);
    expect(state2.isFormValid).toBe(true);

    const state3 = reducer(state2, {
      field: 'frequency',
      value: 'the-invalid-value',
    });

    expect(state3.isFormTouched).toBe(true);
    expect(state3.isFormValid).toBe(false);
    expect(state3.formFields.frequency.errorMessages).toStrictEqual([
      'The frequency value is not valid.',
    ]);
  });
});

describe('Transform: frequencyValidator()', () => {
  test('it should only allow values between 1s and 1h', () => {
    // frequencyValidator() returns an array of error messages so
    // an array with a length of 0 means a successful validation.

    // invalid
    expect(frequencyValidator(0)).toHaveLength(1);
    expect(frequencyValidator('0')).toHaveLength(1);
    expect(frequencyValidator('0s')).toHaveLength(1);
    expect(frequencyValidator(1)).toHaveLength(1);
    expect(frequencyValidator('1')).toHaveLength(1);
    expect(frequencyValidator('1ms')).toHaveLength(1);
    expect(frequencyValidator('1d')).toHaveLength(1);
    expect(frequencyValidator('60s')).toHaveLength(1);
    expect(frequencyValidator('60m')).toHaveLength(1);
    expect(frequencyValidator('60h')).toHaveLength(1);
    expect(frequencyValidator('2h')).toHaveLength(1);
    expect(frequencyValidator('h2')).toHaveLength(1);
    expect(frequencyValidator('2h2')).toHaveLength(1);
    expect(frequencyValidator('h2h')).toHaveLength(1);

    // valid
    expect(frequencyValidator('1s')).toHaveLength(0);
    expect(frequencyValidator('1m')).toHaveLength(0);
    expect(frequencyValidator('1h')).toHaveLength(0);
    expect(frequencyValidator('10s')).toHaveLength(0);
    expect(frequencyValidator('10m')).toHaveLength(0);
    expect(frequencyValidator('59s')).toHaveLength(0);
    expect(frequencyValidator('59m')).toHaveLength(0);
  });
});

describe('Transform: numberValidator()', () => {
  test('it should only allow numbers', () => {
    // numberValidator() returns an array of error messages so
    // an array with a length of 0 means a successful validation.

    // invalid
    expect(numberAboveZeroValidator('a-string')).toHaveLength(1);
    expect(numberAboveZeroValidator('0s')).toHaveLength(1);
    expect(numberAboveZeroValidator('1m')).toHaveLength(1);
    expect(numberAboveZeroValidator(-1)).toHaveLength(1);
    expect(numberAboveZeroValidator(0)).toHaveLength(1);

    // valid
    expect(numberAboveZeroValidator(1)).toHaveLength(0);
    expect(numberAboveZeroValidator('1')).toHaveLength(0);
  });
});
