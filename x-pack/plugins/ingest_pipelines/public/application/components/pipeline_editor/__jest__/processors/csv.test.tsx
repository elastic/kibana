/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setup, SetupResult, getProcessorValue, setupEnvironment } from './processor.helpers';

// Default parameter values automatically added to the CSV processor when saved
const defaultCSVParameters = {
  description: undefined,
  if: undefined,
  ignore_missing: undefined,
  ignore_failure: undefined,
  empty_value: undefined,
  quote: undefined,
  separator: undefined,
  tag: undefined,
  trim: undefined,
};

const CSV_TYPE = 'csv';

describe('Processor: CSV', () => {
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
    await testBed.actions.addProcessorType(CSV_TYPE);
  });

  test('prevents form submission if required fields are not provided', async () => {
    const {
      actions: { saveNewProcessor },
      form,
    } = testBed;

    // Click submit button with only the type defined
    await saveNewProcessor();

    // Expect form error as "field" and "target_field" are required parameters
    expect(form.getErrorsMessages()).toEqual([
      'A field value is required.',
      'A target fields value is required.',
    ]);
  });

  test('saves with default parameter values', async () => {
    const {
      actions: { saveNewProcessor },
      form,
      find,
      component,
    } = testBed;

    // Add "field" value (required)
    form.setInputValue('fieldNameField.input', 'field_1');
    // Add "target_field" value (required)
    await act(async () => {
      find('targetFieldsField.input').simulate('change', [{ label: 'a_value' }]);
    });
    component.update();

    // Save the field
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, CSV_TYPE);
    expect(processors[0][CSV_TYPE]).toEqual({
      ...defaultCSVParameters,
      field: 'field_1',
      target_fields: ['a_value'],
    });
  });

  test('should send ignore_missing:false when the toggle is disabled', async () => {
    const {
      actions: { saveNewProcessor },
      form,
      find,
      component,
    } = testBed;

    // Add "field" value (required)
    form.setInputValue('fieldNameField.input', 'field_1');
    // Add "target_field" value (required)
    await act(async () => {
      find('targetFieldsField.input').simulate('change', [{ label: 'a_value' }]);
    });
    component.update();
    // Disable ignore missing toggle
    form.toggleEuiSwitch('ignoreMissingSwitch.input');

    // Save the field with new changes
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, CSV_TYPE);
    expect(processors[0][CSV_TYPE]).toEqual({
      ...defaultCSVParameters,
      field: 'field_1',
      target_fields: ['a_value'],
      ignore_missing: false,
    });
  });

  test('allows optional parameters to be set', async () => {
    const {
      actions: { saveNewProcessor },
      form,
      find,
      component,
    } = testBed;

    // Add "field" value (required)
    form.setInputValue('fieldNameField.input', 'field_1');
    // Add "target_field" value (required)
    await act(async () => {
      find('targetFieldsField.input').simulate('change', [{ label: 'a_value' }]);
    });
    component.update();

    // Set optional parameters
    form.toggleEuiSwitch('trimSwitch.input');
    form.toggleEuiSwitch('ignoreFailureSwitch.input');
    form.toggleEuiSwitch('ignoreMissingSwitch.input');
    form.setInputValue('quoteValueField.input', '"');
    form.setInputValue('emptyValueField.input', ' ');
    form.setInputValue('separatorValueField.input', ',');

    // Save the field with new changes
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, CSV_TYPE);
    expect(processors[0][CSV_TYPE]).toEqual({
      ...defaultCSVParameters,
      field: 'field_1',
      target_fields: ['a_value'],
      trim: true,
      ignore_failure: true,
      ignore_missing: false,
      separator: ',',
      quote: '"',
      empty_value: ' ',
    });
  });
});
