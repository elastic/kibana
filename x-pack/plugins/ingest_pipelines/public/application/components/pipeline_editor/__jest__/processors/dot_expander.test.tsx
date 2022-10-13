/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setup, SetupResult, getProcessorValue, setupEnvironment } from './processor.helpers';

const DOT_EXPANDER_TYPE = 'dot_expander';

describe('Processor: Dot Expander', () => {
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
    await testBed.actions.addProcessorType(DOT_EXPANDER_TYPE);
  });

  test('prevents form submission if required fields are not provided', async () => {
    const {
      actions: { saveNewProcessor },
      form,
    } = testBed;

    // Click submit button with only the type defined
    await saveNewProcessor();

    // Expect form error as "field" is a required parameter
    expect(form.getErrorsMessages()).toEqual(['A field value is required.']);
  });

  test('prevents form submission if field for the dot notation does not contain a . and not equal to *', async () => {
    const {
      actions: { saveNewProcessor },
      form,
      component,
    } = testBed;

    // Add invalid "field" value (required)
    form.setInputValue('fieldNameField.input', 'missingTheDot');

    // Save the processor with invalid field
    await saveNewProcessor();

    // Move ahead the debounce time which will then execute any validations
    await act(async () => {
      jest.runAllTimers();
    });
    component.update();

    // Expect form error as "field" does not contain '.'
    expect(form.getErrorsMessages()).toEqual([
      'The field name must be an asterisk or contain a dot character.',
    ]);
  });

  test('allows form submission if the field for the dot notation is equal to *', async () => {
    const {
      actions: { saveNewProcessor },
      form,
    } = testBed;

    // Set "field" value to a * for expanding all top-level dotted field names
    form.setInputValue('fieldNameField.input', '*');

    // Save the field
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, DOT_EXPANDER_TYPE);
    expect(processors[0][DOT_EXPANDER_TYPE]).toEqual({
      field: '*',
    });
  });

  test('saves with default parameter values', async () => {
    const {
      actions: { saveNewProcessor },
      form,
    } = testBed;

    // Add "field" value (required)
    form.setInputValue('fieldNameField.input', 'field.with.dot');

    // Save the field
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, DOT_EXPANDER_TYPE);
    expect(processors[0][DOT_EXPANDER_TYPE]).toEqual({
      field: 'field.with.dot',
    });
  });

  test('allows optional parameters to be set', async () => {
    const {
      actions: { saveNewProcessor },
      form,
    } = testBed;

    // Add "field" value (required)
    form.setInputValue('fieldNameField.input', 'field.notation');

    // Set optional parameters
    form.setInputValue('pathField.input', 'somepath');

    // Save the field with new changes
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, DOT_EXPANDER_TYPE);
    expect(processors[0][DOT_EXPANDER_TYPE]).toEqual({
      field: 'field.notation',
      path: 'somepath',
    });
  });
});
