/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setup, SetupResult, getProcessorValue, setupEnvironment } from './processor.helpers';

// Default parameter values automatically added to the user agent processor when saved
const defaultUserAgentParameters = {
  if: undefined,
  regex_file: undefined,
  properties: undefined,
  description: undefined,
  ignore_missing: undefined,
  ignore_failure: undefined,
  extract_device_type: undefined,
};

const USER_AGENT_TYPE = 'user_agent';

describe('Processor: User Agent', () => {
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
    await testBed.actions.addProcessorType(USER_AGENT_TYPE);
  });

  test('prevents form submission if required fields are not provided', async () => {
    const {
      actions: { saveNewProcessor },
      form,
    } = testBed;

    // Click submit button with only the processor type defined
    await saveNewProcessor();

    // Expect form error as "field" is required parameter
    expect(form.getErrorsMessages()).toEqual(['A field value is required.']);
  });

  test('saves with just the default parameter value', async () => {
    const {
      actions: { saveNewProcessor },
      form,
    } = testBed;

    // Add "field" value (required)
    form.setInputValue('fieldNameField.input', 'field_1');
    // Save the field
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, USER_AGENT_TYPE);
    expect(processors[0][USER_AGENT_TYPE]).toEqual({
      ...defaultUserAgentParameters,
      field: 'field_1',
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
    form.setInputValue('targetField.input', 'target_field');
    form.setInputValue('regexFileField.input', 'hello*');
    form.toggleEuiSwitch('ignoreMissingSwitch.input');
    form.toggleEuiSwitch('ignoreFailureSwitch.input');
    form.toggleEuiSwitch('extractDeviceTypeSwitch.input');
    await act(async () => {
      find('propertiesValueField').simulate('change', [{ label: 'os' }]);
    });
    component.update();

    // Save the field with new changes
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, USER_AGENT_TYPE);
    expect(processors[0][USER_AGENT_TYPE]).toEqual({
      ...defaultUserAgentParameters,
      field: 'field_1',
      target_field: 'target_field',
      properties: ['os'],
      regex_file: 'hello*',
      extract_device_type: true,
      ignore_missing: true,
      ignore_failure: true,
    });
  });
});
