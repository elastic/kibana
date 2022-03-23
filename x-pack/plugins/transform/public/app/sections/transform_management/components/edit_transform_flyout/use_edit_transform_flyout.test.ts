/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransformPivotConfig } from '../../../../../../common/types/transform';

import {
  applyFormStateToTransformConfig,
  formReducerFactory,
  frequencyValidator,
  getDefaultState,
  integerAboveZeroValidator,
  retentionPolicyMaxAgeValidator,
  stringValidator,
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

describe('Transform: applyFormStateToTransformConfig()', () => {
  it('should exclude unchanged form fields', () => {
    const transformConfigMock = getTransformConfigMock();

    const formState = getDefaultState(transformConfigMock);

    const updateConfig = applyFormStateToTransformConfig(transformConfigMock, formState);

    // This case will return an empty object. In the actual UI, this case should not happen
    // because the Update-Button will be disabled when no form field was changed.
    expect(Object.keys(updateConfig)).toHaveLength(0);
    expect(updateConfig.description).toBe(undefined);
    // Destination index `index` attribute is nested under `dest` so we're just checking against that.
    expect(updateConfig.dest).toBe(undefined);
    // `docs_per_second` is nested under `settings` so we're just checking against that.
    expect(updateConfig.settings).toBe(undefined);
    expect(updateConfig.frequency).toBe(undefined);
  });

  it('should include previously nonexisting attributes', () => {
    const { description, frequency, ...transformConfigMock } = getTransformConfigMock();

    const formState = getDefaultState({
      ...transformConfigMock,
      description: 'the-new-description',
      dest: {
        index: 'the-new-destination-index',
      },
      frequency: '10m',
      settings: {
        docs_per_second: 10,
      },
    });

    const updateConfig = applyFormStateToTransformConfig(transformConfigMock, formState);

    expect(Object.keys(updateConfig)).toHaveLength(4);
    expect(updateConfig.description).toBe('the-new-description');
    expect(updateConfig.dest?.index).toBe('the-new-destination-index');
    expect(updateConfig.settings?.docs_per_second).toBe(10);
    expect(updateConfig.frequency).toBe('10m');
  });

  it('should only include changed form fields', () => {
    const transformConfigMock = getTransformConfigMock();

    const formState = getDefaultState({
      ...transformConfigMock,
      description: 'the-updated-description',
      dest: {
        index: 'the-updated-destination-index',
        pipeline: 'the-updated-destination-index',
      },
    });

    const updateConfig = applyFormStateToTransformConfig(transformConfigMock, formState);

    expect(Object.keys(updateConfig)).toHaveLength(2);
    expect(updateConfig.description).toBe('the-updated-description');
    expect(updateConfig.dest?.index).toBe('the-updated-destination-index');
    // `docs_per_second` is nested under `settings` so we're just checking against that.
    expect(updateConfig.settings).toBe(undefined);
    expect(updateConfig.frequency).toBe(undefined);
  });

  it('should include dependent form fields', () => {
    const transformConfigMock = getTransformConfigMock();

    const formState = getDefaultState({
      ...transformConfigMock,
      dest: {
        ...transformConfigMock.dest,
        pipeline: 'the-updated-destination-index',
      },
    });

    const updateConfig = applyFormStateToTransformConfig(transformConfigMock, formState);
    expect(Object.keys(updateConfig)).toHaveLength(1);
    // It should include the dependent unchanged destination index
    expect(updateConfig.dest?.index).toBe(transformConfigMock.dest.index);
    expect(updateConfig.dest?.pipeline).toBe('the-updated-destination-index');
  });

  it('should include the destination index when pipeline is unset', () => {
    const transformConfigMock = {
      ...getTransformConfigMock(),
      dest: {
        index: 'the-untouched-destination-index',
        pipeline: 'the-original-pipeline',
      },
    };

    const formState = getDefaultState({
      ...transformConfigMock,
      dest: {
        ...transformConfigMock.dest,
        pipeline: '',
      },
    });

    const updateConfig = applyFormStateToTransformConfig(transformConfigMock, formState);
    expect(Object.keys(updateConfig)).toHaveLength(1);
    // It should include the dependent unchanged destination index
    expect(updateConfig.dest?.index).toBe(transformConfigMock.dest.index);
    expect(typeof updateConfig.dest?.pipeline).toBe('undefined');
  });

  it('should exclude unrelated dependent form fields', () => {
    const transformConfigMock = getTransformConfigMock();

    const formState = getDefaultState({
      ...transformConfigMock,
      description: 'the-updated-description',
    });

    const updateConfig = applyFormStateToTransformConfig(transformConfigMock, formState);
    expect(Object.keys(updateConfig)).toHaveLength(1);
    // It should exclude the dependent unchanged destination section
    expect(typeof updateConfig.dest).toBe('undefined');
    expect(updateConfig.description).toBe('the-updated-description');
  });

  it('should return the config to reset retention policy', () => {
    const transformConfigMock = getTransformConfigMock();

    const formState = getDefaultState({
      ...transformConfigMock,
      retention_policy: {
        time: { field: 'the-time-field', max_age: '1d' },
      },
    });

    formState.formSections.retentionPolicy.enabled = false;

    const updateConfig = applyFormStateToTransformConfig(transformConfigMock, formState);

    expect(Object.keys(updateConfig)).toHaveLength(1);
    // It should exclude the dependent unchanged destination section
    expect(typeof updateConfig.dest).toBe('undefined');
    expect(updateConfig.retention_policy).toBe(null);
  });
});

describe('Transform: formReducerFactory()', () => {
  it('field updates should trigger form validation', () => {
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

describe('Transform: stringValidator()', () => {
  it('should allow an empty string for optional fields', () => {
    expect(stringValidator('')).toHaveLength(0);
  });

  it('should not allow an empty string for required fields', () => {
    expect(stringValidator('', false)).toHaveLength(1);
  });
});

describe('Transform: frequencyValidator()', () => {
  const transformFrequencyValidator = (arg: string) => frequencyValidator(arg).length === 0;

  it('should fail when the input is not an integer and valid time unit.', () => {
    expect(transformFrequencyValidator('0')).toBe(false);
    expect(transformFrequencyValidator('0.1s')).toBe(false);
    expect(transformFrequencyValidator('1.1m')).toBe(false);
    expect(transformFrequencyValidator('10.1asdf')).toBe(false);
  });

  it('should only allow s/m/h as time unit.', () => {
    expect(transformFrequencyValidator('1ms')).toBe(false);
    expect(transformFrequencyValidator('1s')).toBe(true);
    expect(transformFrequencyValidator('1m')).toBe(true);
    expect(transformFrequencyValidator('1h')).toBe(true);
    expect(transformFrequencyValidator('1d')).toBe(false);
  });

  it('should only allow values above 0 and up to 1 hour.', () => {
    expect(transformFrequencyValidator('0s')).toBe(false);
    expect(transformFrequencyValidator('1s')).toBe(true);
    expect(transformFrequencyValidator('3599s')).toBe(true);
    expect(transformFrequencyValidator('3600s')).toBe(true);
    expect(transformFrequencyValidator('3601s')).toBe(false);
    expect(transformFrequencyValidator('10000s')).toBe(false);

    expect(transformFrequencyValidator('0m')).toBe(false);
    expect(transformFrequencyValidator('1m')).toBe(true);
    expect(transformFrequencyValidator('59m')).toBe(true);
    expect(transformFrequencyValidator('60m')).toBe(true);
    expect(transformFrequencyValidator('61m')).toBe(false);
    expect(transformFrequencyValidator('100m')).toBe(false);

    expect(transformFrequencyValidator('0h')).toBe(false);
    expect(transformFrequencyValidator('1h')).toBe(true);
    expect(transformFrequencyValidator('2h')).toBe(false);
  });
});

describe('Transform: retentionPolicyMaxAgeValidator()', () => {
  const transformRetentionPolicyMaxAgeValidator = (arg: string) =>
    retentionPolicyMaxAgeValidator(arg).length === 0;

  it('should only allow values equal or above 60s.', () => {
    expect(transformRetentionPolicyMaxAgeValidator('0nanos')).toBe(false);
    expect(transformRetentionPolicyMaxAgeValidator('59999999999nanos')).toBe(false);
    expect(transformRetentionPolicyMaxAgeValidator('60000000000nanos')).toBe(true);
    expect(transformRetentionPolicyMaxAgeValidator('60000000001nanos')).toBe(true);

    expect(transformRetentionPolicyMaxAgeValidator('0micros')).toBe(false);
    expect(transformRetentionPolicyMaxAgeValidator('59999999micros')).toBe(false);
    expect(transformRetentionPolicyMaxAgeValidator('60000000micros')).toBe(true);
    expect(transformRetentionPolicyMaxAgeValidator('60000001micros')).toBe(true);

    expect(transformRetentionPolicyMaxAgeValidator('0ms')).toBe(false);
    expect(transformRetentionPolicyMaxAgeValidator('59999ms')).toBe(false);
    expect(transformRetentionPolicyMaxAgeValidator('60000ms')).toBe(true);
    expect(transformRetentionPolicyMaxAgeValidator('60001ms')).toBe(true);

    expect(transformRetentionPolicyMaxAgeValidator('0s')).toBe(false);
    expect(transformRetentionPolicyMaxAgeValidator('1s')).toBe(false);
    expect(transformRetentionPolicyMaxAgeValidator('59s')).toBe(false);
    expect(transformRetentionPolicyMaxAgeValidator('60s')).toBe(true);
    expect(transformRetentionPolicyMaxAgeValidator('61s')).toBe(true);
    expect(transformRetentionPolicyMaxAgeValidator('10000s')).toBe(true);

    expect(transformRetentionPolicyMaxAgeValidator('0m')).toBe(false);
    expect(transformRetentionPolicyMaxAgeValidator('1m')).toBe(true);
    expect(transformRetentionPolicyMaxAgeValidator('100m')).toBe(true);

    expect(transformRetentionPolicyMaxAgeValidator('0h')).toBe(false);
    expect(transformRetentionPolicyMaxAgeValidator('1h')).toBe(true);
    expect(transformRetentionPolicyMaxAgeValidator('2h')).toBe(true);
  });
});

describe('Transform: integerAboveZeroValidator()', () => {
  it('should only allow integers above zero', () => {
    // integerAboveZeroValidator() returns an array of error messages so
    // an array with a length of 0 means a successful validation.

    // invalid
    expect(integerAboveZeroValidator('a-string')).toHaveLength(1);
    expect(integerAboveZeroValidator('0s')).toHaveLength(1);
    expect(integerAboveZeroValidator('1m')).toHaveLength(1);
    expect(integerAboveZeroValidator('1.')).toHaveLength(1);
    expect(integerAboveZeroValidator('1..')).toHaveLength(1);
    expect(integerAboveZeroValidator('1.0')).toHaveLength(1);
    expect(integerAboveZeroValidator(-1)).toHaveLength(1);
    expect(integerAboveZeroValidator(0)).toHaveLength(1);
    expect(integerAboveZeroValidator(0.1)).toHaveLength(1);

    // valid
    expect(integerAboveZeroValidator(1)).toHaveLength(0);
    expect(integerAboveZeroValidator('1')).toHaveLength(0);
  });
});
