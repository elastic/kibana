/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setup, SetupResult, getProcessorValue, setupEnvironment } from './processor.helpers';

const CIRCLE_TYPE = 'circle';

describe('Processor: Circle', () => {
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
    const {
      actions: { addProcessor, addProcessorType },
    } = testBed;
    // Open the processor flyout
    addProcessor();

    // Add type (the other fields are not visible until a type is selected)
    await addProcessorType(CIRCLE_TYPE);
  });

  test('prevents form submission if required fields are not provided', async () => {
    const {
      actions: { saveNewProcessor },
      form,
    } = testBed;

    // Click submit button with only the type defined
    await saveNewProcessor();

    // Expect form error as "field", "shape_type" and "error_distance" are required parameters
    expect(form.getErrorsMessages()).toEqual([
      'A field value is required.',
      'An error distance value is required.',
      'A shape type value is required.',
    ]);
  });

  test('saves with required parameter values', async () => {
    const {
      actions: { saveNewProcessor },
      form,
    } = testBed;

    // Add "field" value (required)
    form.setInputValue('fieldNameField.input', 'field_1');
    // Save the field
    form.setSelectValue('shapeSelectorField', 'shape');
    // Set the error distance
    form.setInputValue('errorDistanceField.input', '10');

    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, CIRCLE_TYPE);

    expect(processors[0].circle).toEqual({
      field: 'field_1',
      error_distance: 10,
      shape_type: 'shape',
    });
  });

  test('allows optional parameters to be set', async () => {
    const {
      actions: { saveNewProcessor },
      form,
    } = testBed;

    // Set required parameters
    form.setInputValue('fieldNameField.input', 'field_1');
    form.setSelectValue('shapeSelectorField', 'geo_shape');
    form.setInputValue('errorDistanceField.input', '10');

    // Set optional parameters
    form.setInputValue('targetField.input', 'target_field');
    form.toggleEuiSwitch('ignoreMissingSwitch.input');

    // Save the field with new changes
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, CIRCLE_TYPE);
    expect(processors[0].circle).toEqual({
      field: 'field_1',
      error_distance: 10,
      shape_type: 'geo_shape',
      target_field: 'target_field',
      ignore_missing: true,
    });
  });
});
