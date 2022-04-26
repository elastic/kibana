/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setup, SetupResult, getProcessorValue, setupEnvironment } from './processor.helpers';

// Default parameter values automatically added to the registered domain processor when saved
const defaultRegisteredDomainParameters = {
  description: undefined,
  if: undefined,
  ignore_missing: undefined,
  ignore_failure: undefined,
};

const REGISTERED_DOMAIN_TYPE = 'registered_domain';

describe('Processor: Registered Domain', () => {
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
    await testBed.actions.addProcessorType(REGISTERED_DOMAIN_TYPE);
  });

  test('prevents form submission if required fields are not provided', async () => {
    const {
      actions: { saveNewProcessor },
      form,
    } = testBed;

    // Click submit button with only the type defined
    await saveNewProcessor();

    // Expect form error as "field" is required parameter
    expect(form.getErrorsMessages()).toEqual(['A field value is required.']);
  });

  test('saves with default parameter values', async () => {
    const {
      actions: { saveNewProcessor },
      form,
    } = testBed;

    // Add "field" value (required)
    form.setInputValue('fieldNameField.input', 'field_1');
    // Save the field
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, REGISTERED_DOMAIN_TYPE);
    expect(processors[0][REGISTERED_DOMAIN_TYPE]).toEqual({
      field: 'field_1',
      ...defaultRegisteredDomainParameters,
    });
  });

  test('should still send ignore_missing:false when the toggle is disabled', async () => {
    const {
      actions: { saveNewProcessor },
      form,
    } = testBed;

    // Add "field" value (required)
    form.setInputValue('fieldNameField.input', 'field_1');

    // Disable ignore missing toggle
    form.toggleEuiSwitch('ignoreMissingSwitch.input');

    // Save the field with new changes
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, REGISTERED_DOMAIN_TYPE);
    expect(processors[0][REGISTERED_DOMAIN_TYPE]).toEqual({
      ...defaultRegisteredDomainParameters,
      field: 'field_1',
      ignore_missing: false,
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
    form.setInputValue('targetField.input', 'target_field');

    // Save the field with new changes
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, REGISTERED_DOMAIN_TYPE);
    expect(processors[0][REGISTERED_DOMAIN_TYPE]).toEqual({
      field: 'field_1',
      target_field: 'target_field',
      ...defaultRegisteredDomainParameters,
    });
  });
});
