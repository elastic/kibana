/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { debug } from 'console';
import { act } from 'react-dom/test-utils';
import { setup, SetupResult } from './processor.helpers';

// Default parameter values automatically added to the URI parts processor when saved
const defaultAppendParameters = {
  ignore_failure: undefined,
  description: undefined,
};

describe('Processor: Append', () => {
  let onUpdate: jest.Mock;
  let testBed: SetupResult;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    onUpdate = jest.fn();

    await act(async () => {
      testBed = await setup({
        value: {
          processors: [],
        },
        onFlyoutOpen: jest.fn(),
        onUpdate,
      });
    });
    testBed.component.update();
  });

  test('prevents form submission if required fields are not provided', async () => {
    const {
      actions: { addProcessor, saveNewProcessor, addProcessorType },
      form,
    } = testBed;

    // Open flyout to add new processor
    addProcessor();
    // Click submit button without entering any fields
    await saveNewProcessor();

    // Expect form error as a processor type is required
    expect(form.getErrorsMessages()).toEqual(['A type is required.']);

    // Add type (the other fields are not visible until a type is selected)
    await addProcessorType({ type: 'append', label: 'Append' });

    // Click submit button with only the type defined
    await saveNewProcessor();

    // Expect form error as "field" is required parameter
    expect(form.getErrorsMessages()).toEqual(['A field value is required.', 'A value is required.']);
  });

  test.only('saves with default parameter values', async () => {
    const {
      actions: { addProcessor, saveNewProcessor, addProcessorType },
      form, find
    } = testBed;

    // Open flyout to add new processor
    addProcessor();
    // Add type (the other fields are not visible until a type is selected)
    await addProcessorType({ type: 'append', label: 'Append' });
    // Add "field" value (required)
    form.setInputValue('fieldNameField.input', 'field_1');

    // find('valueField.comboBoxInput').simulate('change', [{ label: 'Some_Value' }]);

    form.setInputValue('valueField.comboBoxSearchInput', 'Some_Value')
    // Save the field
    await saveNewProcessor();

    const [onUpdateResult] = onUpdate.mock.calls[onUpdate.mock.calls.length - 1];
    const { processors } = onUpdateResult.getData();
    expect(processors[0].append).toEqual({
      field: 'field_1',
      value: 'Some_Value',
      ...defaultAppendParameters,
    });
  });

  test('allows optional parameters to be set', async () => {
    const {
      actions: { addProcessor, addProcessorType, saveNewProcessor },
      form,
    } = testBed;

    // Open flyout to add new processor
    addProcessor();
    // Add type (the other fields are not visible until a type is selected)
    await addProcessorType({ type: 'append', label: 'Append' });
    // Add "field" value (required)
    form.setInputValue('fieldNameField.input', 'field_1');

    // Set optional parameteres
    form.setInputValue('targetField.input', 'target_field');

    // Save the field with new changes
    await saveNewProcessor();

    const [onUpdateResult] = onUpdate.mock.calls[onUpdate.mock.calls.length - 1];
    const { processors } = onUpdateResult.getData();
    expect(processors[0].uri_parts).toEqual({
      description: undefined,
      field: 'field_1',
      ignore_failure: undefined,
      target_field: 'target_field',
    });
  });
});
