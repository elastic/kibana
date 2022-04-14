/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setup, SetupResult, getProcessorValue, setupEnvironment } from './processor.helpers';

const APPEND_TYPE = 'append';

describe('Processor: Append', () => {
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
    await addProcessorType(APPEND_TYPE);
  });

  test('prevents form submission if required fields are not provided', async () => {
    const {
      actions: { saveNewProcessor },
      form,
    } = testBed;

    // Click submit button with only the type defined
    await saveNewProcessor();

    // Expect form error as "field" and "value" are required parameters
    expect(form.getErrorsMessages()).toEqual([
      'A field value is required.',
      'A value is required.',
    ]);
  });

  test('saves with required parameter values', async () => {
    const {
      actions: { saveNewProcessor },
      form,
      find,
      component,
    } = testBed;

    // Add "field" value (required)
    form.setInputValue('fieldNameField.input', 'field_1');

    await act(async () => {
      find('appendValueField.input').simulate('change', [{ label: 'Some_Value' }]);
    });
    component.update();

    // Save the field
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, APPEND_TYPE);
    expect(processors[0].append).toEqual({
      field: 'field_1',
      value: ['Some_Value'],
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

    // Set optional parameteres
    await act(async () => {
      find('appendValueField.input').simulate('change', [{ label: 'Some_Value' }]);
      component.update();
    });

    form.toggleEuiSwitch('ignoreFailureSwitch.input');
    // Save the field with new changes
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, APPEND_TYPE);
    expect(processors[0].append).toEqual({
      field: 'field_1',
      ignore_failure: true,
      value: ['Some_Value'],
    });
  });
});
