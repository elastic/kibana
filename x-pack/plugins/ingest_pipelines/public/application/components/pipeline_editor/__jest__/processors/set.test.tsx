/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setup, SetupResult, getProcessorValue, setupEnvironment } from './processor.helpers';

const SET_TYPE = 'set';

describe('Processor: Set', () => {
  let onUpdate: jest.Mock;
  let testBed: SetupResult;
  const { httpSetup } = setupEnvironment();

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    onUpdate = jest.fn();

    await act(async () => {
      testBed = await setup(httpSetup, {
        value: {
          processors: [],
        },
        onFlyoutOpen: jest.fn(),
        onUpdate,
      });
    });

    testBed.component.update();

    // Open flyout to add new processor
    testBed.actions.addProcessor();
    // Add type (the other fields are not visible until a type is selected)
    await testBed.actions.addProcessorType(SET_TYPE);
  });

  test('prevents form submission if required fields are not provided', async () => {
    const {
      actions: { saveNewProcessor },
      form,
    } = testBed;

    // Click submit button with only the type defined
    await saveNewProcessor();

    // Expect form error as "field" is required parameter
    expect(form.getErrorsMessages()).toEqual([
      'A field value is required.',
      'A value is required.',
    ]);
  });

  test('saves with default parameter value', async () => {
    const {
      actions: { saveNewProcessor },
      form,
    } = testBed;

    // Add required fields
    form.setInputValue('valueFieldInput', 'value');
    form.setInputValue('fieldNameField.input', 'field_1');
    // Save the field
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, SET_TYPE);
    expect(processors[0][SET_TYPE]).toEqual({
      field: 'field_1',
      value: 'value',
    });
  });

  test('allows to save the the copy_from value', async () => {
    const {
      actions: { saveNewProcessor },
      form,
      find,
    } = testBed;

    // Add required fields
    form.setInputValue('fieldNameField.input', 'field_1');

    // Set value field
    form.setInputValue('valueFieldInput', 'value');

    // Toggle to copy_from field and set a random value
    find('toggleCustomField').simulate('click');
    form.setInputValue('copyFromInput', 'copy_from');

    // Save the field with new changes
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, SET_TYPE);
    expect(processors[0][SET_TYPE]).toEqual({
      field: 'field_1',
      copy_from: 'copy_from',
    });
  });

  test('should allow to set mediaType when value is a template snippet', async () => {
    const {
      actions: { saveNewProcessor },
      form,
      exists,
    } = testBed;

    // Add "field" value (required)
    form.setInputValue('fieldNameField.input', 'field_1');

    // Shouldnt be able to set mediaType if value is not a template string
    form.setInputValue('valueFieldInput', 'hello');
    expect(exists('mediaTypeSelectorField')).toBe(false);

    // Set value to a template snippet and media_type to a non-default value
    form.setInputValue('valueFieldInput', '{{{hello}}}');
    form.setSelectValue('mediaTypeSelectorField', 'text/plain');

    // Save the field with new changes
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, SET_TYPE);
    expect(processors[0][SET_TYPE]).toEqual({
      field: 'field_1',
      value: '{{{hello}}}',
      media_type: 'text/plain',
    });
  });

  test('allows optional parameters to be set', async () => {
    const {
      actions: { saveNewProcessor },
      form,
    } = testBed;

    // Add "field" value (required)
    form.setInputValue('fieldNameField.input', 'field_1');

    // Set optional parameteres
    form.setInputValue('valueFieldInput', '{{{hello}}}');
    form.toggleEuiSwitch('overrideField.input');
    form.toggleEuiSwitch('ignoreEmptyField.input');

    // Save the field with new changes
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, SET_TYPE);
    expect(processors[0][SET_TYPE]).toEqual({
      field: 'field_1',
      value: '{{{hello}}}',
      ignore_empty_value: true,
      override: false,
    });
  });
});
