/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setup, SetupResult, getProcessorValue, setupEnvironment } from './processor.helpers';

// Default parameter values automatically added to the `convert processor` when saved
const defaultConvertParameters = {
  if: undefined,
  tag: undefined,
  description: undefined,
  target_field: undefined,
  ignore_missing: undefined,
  ignore_failure: undefined,
};

const CONVERT_TYPE = 'convert';

describe('Processor: Convert', () => {
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
    await testBed.actions.addProcessorType(CONVERT_TYPE);
  });

  test('prevents form submission if required fields are not provided', async () => {
    const {
      actions: { saveNewProcessor },
      form,
    } = testBed;

    // Click submit button with only the processor type defined
    await saveNewProcessor();

    // Expect form error as "field" and "type" are required parameters
    expect(form.getErrorsMessages()).toEqual([
      'A field value is required.',
      'A type value is required.',
    ]);
  });

  test('saves with default parameter values', async () => {
    const {
      actions: { saveNewProcessor },
      form,
    } = testBed;

    // Add "field" value (required)
    form.setInputValue('fieldNameField.input', 'field_1');
    // Add "type" value (required)
    form.setSelectValue('typeSelectorField', 'ip');

    // Save the field
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, CONVERT_TYPE);
    expect(processors[0][CONVERT_TYPE]).toEqual({
      ...defaultConvertParameters,
      field: 'field_1',
      type: 'ip',
    });
  });

  test('allows optional parameters to be set', async () => {
    const {
      actions: { saveNewProcessor },
      form,
    } = testBed;

    // Add "field" value (required)
    form.setInputValue('fieldNameField.input', 'field_1');
    // Add "type" value (required)
    form.setSelectValue('typeSelectorField', 'ip');

    // Set optional parameteres
    form.setInputValue('targetField.input', 'target_field');
    form.toggleEuiSwitch('ignoreMissingSwitch.input');
    form.toggleEuiSwitch('ignoreFailureSwitch.input');

    // Save the field with new changes
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, CONVERT_TYPE);
    expect(processors[0][CONVERT_TYPE]).toEqual({
      ...defaultConvertParameters,
      type: 'ip',
      field: 'field_1',
      target_field: 'target_field',
      ignore_failure: true,
      ignore_missing: true,
    });
  });
});
