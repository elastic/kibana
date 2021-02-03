/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { act } from 'react-dom/test-utils';
import { setup, SetupResult } from './processor.helpers';

// Default parameter values automatically added to the URI parts processor when saved
const defaultUriPartsParameters = {
  keep_original: undefined,
  remove_if_successful: undefined,
  ignore_failure: undefined,
  description: undefined,
};

describe('Processor: URI parts', () => {
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
    await addProcessorType({ type: 'uri_parts', label: 'URI parts' });

    // Click submit button with only the type defined
    await saveNewProcessor();

    // Expect form error as "field" is required parameter
    expect(form.getErrorsMessages()).toEqual(['A field value is required.']);
  });

  test('saves with default parameter values', async () => {
    const {
      actions: { addProcessor, saveNewProcessor, addProcessorType },
      form,
    } = testBed;

    // Open flyout to add new processor
    addProcessor();
    // Add type (the other fields are not visible until a type is selected)
    await addProcessorType({ type: 'uri_parts', label: 'URI parts' });
    // Add "field" value (required)
    form.setInputValue('fieldNameField.input', 'field_1');
    // Save the field
    await saveNewProcessor();

    const [onUpdateResult] = onUpdate.mock.calls[onUpdate.mock.calls.length - 1];
    const { processors } = onUpdateResult.getData();
    expect(processors[0].uri_parts).toEqual({
      field: 'field_1',
      ...defaultUriPartsParameters,
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
    await addProcessorType({ type: 'uri_parts', label: 'URI parts' });
    // Add "field" value (required)
    form.setInputValue('fieldNameField.input', 'field_1');

    // Set optional parameteres
    form.setInputValue('targetField.input', 'target_field');
    form.toggleEuiSwitch('keepOriginalField.input');
    form.toggleEuiSwitch('removeIfSuccessfulField.input');

    // Save the field with new changes
    await saveNewProcessor();

    const [onUpdateResult] = onUpdate.mock.calls[onUpdate.mock.calls.length - 1];
    const { processors } = onUpdateResult.getData();
    expect(processors[0].uri_parts).toEqual({
      description: undefined,
      field: 'field_1',
      ignore_failure: undefined,
      keep_original: false,
      remove_if_successful: true,
      target_field: 'target_field',
    });
  });
});
