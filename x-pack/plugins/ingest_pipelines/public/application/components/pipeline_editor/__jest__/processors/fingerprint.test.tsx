/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setup, SetupResult, getProcessorValue, setupEnvironment } from './processor.helpers';

// Default parameter values automatically added to the registered domain processor when saved
const defaultFingerprintParameters = {
  if: undefined,
  tag: undefined,
  method: undefined,
  salt: undefined,
  description: undefined,
  ignore_missing: undefined,
  ignore_failure: undefined,
  target_field: undefined,
};

const FINGERPRINT_TYPE = 'fingerprint';

describe('Processor: Fingerprint', () => {
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
    await testBed.actions.addProcessorType(FINGERPRINT_TYPE);
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
      find,
      component,
    } = testBed;

    // Add "fields" value (required)
    await act(async () => {
      find('fieldsValueField.input').simulate('change', [{ label: 'user' }]);
    });
    component.update();
    // Save the field
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, FINGERPRINT_TYPE);
    expect(processors[0][FINGERPRINT_TYPE]).toEqual({
      ...defaultFingerprintParameters,
      fields: ['user'],
    });
  });

  test('allows optional parameters to be set', async () => {
    const {
      actions: { saveNewProcessor },
      form,
      find,
      component,
    } = testBed;

    // Add "fields" value (required)
    await act(async () => {
      find('fieldsValueField.input').simulate('change', [{ label: 'user' }]);
    });
    component.update();

    // Set optional parameteres
    form.setInputValue('targetField.input', 'target_field');
    form.setSelectValue('methodsValueField', 'SHA-256');
    form.setInputValue('saltValueField.input', 'salt');
    form.toggleEuiSwitch('ignoreMissingSwitch.input');
    form.toggleEuiSwitch('ignoreFailureSwitch.input');

    // Save the field with new changes
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, FINGERPRINT_TYPE);
    expect(processors[0][FINGERPRINT_TYPE]).toEqual({
      ...defaultFingerprintParameters,
      fields: ['user'],
      target_field: 'target_field',
      method: 'SHA-256',
      salt: 'salt',
      ignore_missing: true,
      ignore_failure: true,
    });
  });
});
