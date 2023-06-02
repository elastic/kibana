/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setup, SetupResult, getProcessorValue, setupEnvironment } from './processor.helpers';

const PROCESSOR_TYPE = 'enrich';

describe('Processor: Enrich', () => {
  let onUpdate: jest.Mock;
  let testBed: SetupResult;
  const { httpSetup } = setupEnvironment();

  beforeAll(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
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
    await addProcessorType(PROCESSOR_TYPE);
  });

  test('prevents form submission when field, policy name and target field are not provided', async () => {
    const {
      actions: { saveNewProcessor },
      form,
    } = testBed;

    // Click submit button with only the type defined
    await saveNewProcessor();

    // Expect form errors from the required fields
    expect(form.getErrorsMessages()).toEqual([
      'A field value is required.',
      'A value is required.',
      'A target field value is required.',
    ]);
  });

  test('saves with required field', async () => {
    const {
      actions: { saveNewProcessor },
      form,
    } = testBed;

    // set required fields
    form.setInputValue('fieldNameField.input', 'field_1');
    form.setInputValue('policyNameField.input', 'policy_1');
    form.setInputValue('targetField.input', 'field_2');

    // Save the field
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, PROCESSOR_TYPE);
    expect(processors[0][PROCESSOR_TYPE]).toEqual({
      field: 'field_1',
      policy_name: 'policy_1',
      target_field: 'field_2',
    });
  });

  test('allows optional parameters to be set', async () => {
    const {
      actions: { saveNewProcessor },
      form,
    } = testBed;

    // set required fields
    form.setInputValue('fieldNameField.input', 'field_1');
    form.setInputValue('policyNameField.input', 'policy_1');
    form.setInputValue('targetField.input', 'field_2');

    // Set optional parameteres
    form.toggleEuiSwitch('overrideField.input');

    // Save the field
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, PROCESSOR_TYPE);
    expect(processors[0][PROCESSOR_TYPE]).toEqual({
      field: 'field_1',
      policy_name: 'policy_1',
      target_field: 'field_2',
      override: false,
    });
  });
});
