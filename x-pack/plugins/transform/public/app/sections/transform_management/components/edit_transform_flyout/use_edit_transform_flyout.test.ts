/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TransformPivotConfig } from '../../../../common';

import {
  applyFormFieldsToTransformConfig,
  formReducerFactory,
  getDefaultState,
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

const getDescriptionFieldMock = (value = '') => ({
  isOptional: true,
  value,
  errorMessages: [],
  validator: 'string',
});

const getFrequencyFieldMock = (value = '') => ({
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
      frequency: getFrequencyFieldMock(),
    });

    // This case will return an empty object. In the actual UI, this case should not happen
    // because the Update-Button will be disabled when no form field was changed.
    expect(Object.keys(updateConfig)).toHaveLength(0);
    expect(updateConfig.description).toBe(undefined);
    expect(updateConfig.frequency).toBe(undefined);
  });

  test('should include previously nonexisting attributes', () => {
    const transformConfigMock = getTransformConfigMock();
    delete transformConfigMock.description;
    delete transformConfigMock.frequency;

    const updateConfig = applyFormFieldsToTransformConfig(transformConfigMock, {
      description: getDescriptionFieldMock('the-new-description'),
      frequency: getFrequencyFieldMock(undefined),
    });

    expect(Object.keys(updateConfig)).toHaveLength(1);
    expect(updateConfig.description).toBe('the-new-description');
    expect(updateConfig.frequency).toBe(undefined);
  });

  test('should only include changed form fields', () => {
    const transformConfigMock = getTransformConfigMock();
    const updateConfig = applyFormFieldsToTransformConfig(transformConfigMock, {
      description: getDescriptionFieldMock('the-updated-description'),
      frequency: getFrequencyFieldMock(),
    });

    expect(Object.keys(updateConfig)).toHaveLength(1);
    expect(updateConfig.description).toBe('the-updated-description');
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
