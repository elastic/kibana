/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTransformConfigMock } from './__mocks__/transform_config';

import { applyFormStateToTransformConfig } from './apply_form_state_to_transform_config';
import { getDefaultState } from './get_default_state';

describe('Transform: applyFormStateToTransformConfig()', () => {
  it('should exclude unchanged form fields', () => {
    const transformConfigMock = getTransformConfigMock();

    const { formFields, formSections } = getDefaultState(transformConfigMock);

    const updateConfig = applyFormStateToTransformConfig(
      transformConfigMock,
      formFields,
      formSections
    );

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

    const { formFields, formSections } = getDefaultState({
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

    const updateConfig = applyFormStateToTransformConfig(
      transformConfigMock,
      formFields,
      formSections
    );

    expect(Object.keys(updateConfig)).toHaveLength(4);
    expect(updateConfig.description).toBe('the-new-description');
    expect(updateConfig.dest?.index).toBe('the-new-destination-index');
    expect(updateConfig.settings?.docs_per_second).toBe(10);
    expect(updateConfig.frequency).toBe('10m');
  });

  it('should only include changed form fields', () => {
    const transformConfigMock = getTransformConfigMock();

    const { formFields, formSections } = getDefaultState({
      ...transformConfigMock,
      description: 'the-updated-description',
      dest: {
        index: 'the-updated-destination-index',
        pipeline: 'the-updated-destination-index',
      },
    });

    const updateConfig = applyFormStateToTransformConfig(
      transformConfigMock,
      formFields,
      formSections
    );

    expect(Object.keys(updateConfig)).toHaveLength(2);
    expect(updateConfig.description).toBe('the-updated-description');
    expect(updateConfig.dest?.index).toBe('the-updated-destination-index');
    // `docs_per_second` is nested under `settings` so we're just checking against that.
    expect(updateConfig.settings).toBe(undefined);
    expect(updateConfig.frequency).toBe(undefined);
  });

  it('should include dependent form fields', () => {
    const transformConfigMock = getTransformConfigMock();

    const { formFields, formSections } = getDefaultState({
      ...transformConfigMock,
      dest: {
        ...transformConfigMock.dest,
        pipeline: 'the-updated-destination-index',
      },
    });

    const updateConfig = applyFormStateToTransformConfig(
      transformConfigMock,
      formFields,
      formSections
    );
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

    const { formFields, formSections } = getDefaultState({
      ...transformConfigMock,
      dest: {
        ...transformConfigMock.dest,
        pipeline: '',
      },
    });

    const updateConfig = applyFormStateToTransformConfig(
      transformConfigMock,
      formFields,
      formSections
    );
    expect(Object.keys(updateConfig)).toHaveLength(1);
    // It should include the dependent unchanged destination index
    expect(updateConfig.dest?.index).toBe(transformConfigMock.dest.index);
    expect(typeof updateConfig.dest?.pipeline).toBe('undefined');
  });

  it('should exclude unrelated dependent form fields', () => {
    const transformConfigMock = getTransformConfigMock();

    const { formFields, formSections } = getDefaultState({
      ...transformConfigMock,
      description: 'the-updated-description',
    });

    const updateConfig = applyFormStateToTransformConfig(
      transformConfigMock,
      formFields,
      formSections
    );
    expect(Object.keys(updateConfig)).toHaveLength(1);
    // It should exclude the dependent unchanged destination section
    expect(typeof updateConfig.dest).toBe('undefined');
    expect(updateConfig.description).toBe('the-updated-description');
  });

  it('should return the config to reset retention policy', () => {
    const transformConfigMock = getTransformConfigMock();

    const { formFields, formSections } = getDefaultState({
      ...transformConfigMock,
      retention_policy: {
        time: { field: 'the-time-field', max_age: '1d' },
      },
    });

    formSections.retentionPolicy.enabled = false;

    const updateConfig = applyFormStateToTransformConfig(
      transformConfigMock,
      formFields,
      formSections
    );

    expect(Object.keys(updateConfig)).toHaveLength(1);
    // It should exclude the dependent unchanged destination section
    expect(typeof updateConfig.dest).toBe('undefined');
    expect(updateConfig.retention_policy).toBe(null);
  });
});
