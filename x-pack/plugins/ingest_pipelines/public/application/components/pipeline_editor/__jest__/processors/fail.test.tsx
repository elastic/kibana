/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setup, SetupResult, getProcessorValue } from './processor.helpers';

// Default parameter values automatically added to the URI parts processor when saved
const defaultFailParameters = {
  ignore_failure: undefined,
  if: undefined,
  tag: undefined,
  description: undefined,
};

const FAIL_TYPE = 'fail';
describe('Processor: Fail', () => {
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
      form
    } = testBed;

    // Open flyout to add new processor
    addProcessor();
    // Click submit button without entering any fields
    await saveNewProcessor();

    // Expect form error as a processor type is required
    expect(form.getErrorsMessages()).toEqual(['A type is required.']);

    // Add type (the other fields are not visible until a type is selected)
    await addProcessorType(FAIL_TYPE);

    // Click submit button with only the type defined
    await saveNewProcessor();

    // Expect form error as "field" is required parameter
    expect(form.getErrorsMessages()).toEqual(['A message is required.']);
  });

  test('saves with default parameter values', async () => {
    const {
      actions: { addProcessor, saveNewProcessor, addProcessorType },
      form,
    } = testBed;

    // Open flyout to add new processor
    addProcessor();
    // Add type (the other fields are not visible until a type is selected)
    await addProcessorType(FAIL_TYPE);
    // Add "message" value (required)
    form.setInputValue('messageField.input', 'Test Error Message');
    // Save the field
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, FAIL_TYPE);
    expect(processors[0].fail).toEqual({
      message: 'Test Error Message',
      ...defaultFailParameters,
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
    await addProcessorType(FAIL_TYPE);
    // Add "message" value (required)
    form.setInputValue('messageField.input', 'Test Error Message');

    // Save the field with new changes
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, FAIL_TYPE);
    expect(processors[0].fail).toEqual({
      message: 'Test Error Message',
      ignore_failure: undefined,
      if: undefined,
      tag: undefined,
      description: undefined,
    });
  });
});
