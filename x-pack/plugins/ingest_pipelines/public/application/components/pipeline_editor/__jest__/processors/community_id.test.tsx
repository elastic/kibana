/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setup, SetupResult, getProcessorValue, setupEnvironment } from './processor.helpers';

const COMMUNITY_ID_TYPE = 'community_id';

describe('Processor: Community id', () => {
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
    await testBed.actions.addProcessorType(COMMUNITY_ID_TYPE);
  });

  test('can submit if no fields are filled', async () => {
    const {
      actions: { saveNewProcessor },
      form,
    } = testBed;

    // Click submit button with no fields filled
    await saveNewProcessor();

    // Expect no form errors
    expect(form.getErrorsMessages()).toHaveLength(0);
  });

  test('allows to set either iana_number or transport', async () => {
    const { find, form } = testBed;

    expect(find('ianaField.input').exists()).toBe(true);
    expect(find('transportField.input').exists()).toBe(true);

    form.setInputValue('ianaField.input', 'iana_number');
    expect(find('transportField.input').props().disabled).toBe(true);

    form.setInputValue('ianaField.input', '');
    form.setInputValue('transportField.input', 'transport');
    expect(find('ianaField.input').props().disabled).toBe(true);
  });

  test('allows optional parameters to be set', async () => {
    const {
      actions: { saveNewProcessor },
      form,
    } = testBed;

    form.toggleEuiSwitch('ignoreMissingSwitch.input');
    form.toggleEuiSwitch('ignoreFailureSwitch.input');
    form.setInputValue('sourceIpField.input', 'source.ip');
    form.setInputValue('sourcePortField.input', 'source.port');
    form.setInputValue('targetField.input', 'target_field');
    form.setInputValue('destinationIpField.input', 'destination.ip');
    form.setInputValue('destinationPortField.input', 'destination.port');
    form.setInputValue('icmpTypeField.input', 'icmp_type');
    form.setInputValue('icmpCodeField.input', 'icmp_code');
    form.setInputValue('ianaField.input', 'iana');
    form.setInputValue('seedField.input', '10');

    // Save the field with new changes
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, COMMUNITY_ID_TYPE);
    expect(processors[0][COMMUNITY_ID_TYPE]).toEqual({
      ignore_failure: true,
      ignore_missing: false,
      target_field: 'target_field',
      source_ip: 'source.ip',
      source_port: 'source.port',
      destination_ip: 'destination.ip',
      destination_port: 'destination.port',
      icmp_type: 'icmp_type',
      icmp_code: 'icmp_code',
      iana_number: 'iana',
      seed: 10,
    });
  });
});
