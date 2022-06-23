/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setup, SetupResult, getProcessorValue, setupEnvironment } from './processor.helpers';

// Default parameter values automatically added to the network direction processor when saved
const defaultNetworkDirectionParameters = {
  if: undefined,
  tag: undefined,
  source_ip: undefined,
  description: undefined,
  target_field: undefined,
  ignore_missing: undefined,
  ignore_failure: undefined,
  destination_ip: undefined,
  internal_networks: undefined,
  internal_networks_field: undefined,
};

const NETWORK_DIRECTION_TYPE = 'network_direction';

describe('Processor: Network Direction', () => {
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
    await testBed.actions.addProcessorType(NETWORK_DIRECTION_TYPE);
  });

  test('prevents form submission if internal_network field is not provided', async () => {
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

    // Add "networkDirectionField" value (required)
    await act(async () => {
      find('networkDirectionField.input').simulate('change', [{ label: 'loopback' }]);
    });
    component.update();

    // Save the field
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, NETWORK_DIRECTION_TYPE);
    expect(processors[0][NETWORK_DIRECTION_TYPE]).toEqual({
      ...defaultNetworkDirectionParameters,
      internal_networks: ['loopback'],
    });
  });

  test('allows to set internal_networks_field', async () => {
    const {
      actions: { saveNewProcessor },
      form,
      find,
    } = testBed;

    find('toggleCustomField').simulate('click');

    form.setInputValue('networkDirectionField.input', 'internal_networks_field');

    // Save the field with new changes
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, NETWORK_DIRECTION_TYPE);
    expect(processors[0][NETWORK_DIRECTION_TYPE]).toEqual({
      ...defaultNetworkDirectionParameters,
      internal_networks_field: 'internal_networks_field',
    });
  });

  test('allows to set just internal_networks_field or internal_networks', async () => {
    const {
      actions: { saveNewProcessor },
      form,
      find,
      component,
    } = testBed;

    // Set internal_networks field
    await act(async () => {
      find('networkDirectionField.input').simulate('change', [{ label: 'loopback' }]);
    });
    component.update();

    // Toggle to internal_networks_field and set a random value
    find('toggleCustomField').simulate('click');
    form.setInputValue('networkDirectionField.input', 'internal_networks_field');

    // Save the field with new changes
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, NETWORK_DIRECTION_TYPE);
    expect(processors[0][NETWORK_DIRECTION_TYPE]).toEqual({
      ...defaultNetworkDirectionParameters,
      internal_networks_field: 'internal_networks_field',
    });
  });

  test('allows optional parameters to be set', async () => {
    const {
      actions: { saveNewProcessor },
      form,
      find,
      component,
    } = testBed;

    // Add "networkDirectionField" value (required)
    await act(async () => {
      find('networkDirectionField.input').simulate('change', [{ label: 'loopback' }]);
    });
    component.update();

    // Set optional parameteres
    form.toggleEuiSwitch('ignoreMissingSwitch.input');
    form.toggleEuiSwitch('ignoreFailureSwitch.input');
    form.setInputValue('sourceIpField.input', 'source.ip');
    form.setInputValue('targetField.input', 'target_field');
    form.setInputValue('destinationIpField.input', 'destination.ip');

    // Save the field with new changes
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, NETWORK_DIRECTION_TYPE);
    expect(processors[0][NETWORK_DIRECTION_TYPE]).toEqual({
      ...defaultNetworkDirectionParameters,
      ignore_failure: true,
      ignore_missing: false,
      source_ip: 'source.ip',
      target_field: 'target_field',
      destination_ip: 'destination.ip',
      internal_networks: ['loopback'],
    });
  });
});
