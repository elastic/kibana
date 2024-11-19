/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setup, SetupResult, getProcessorValue, setupEnvironment } from './processor.helpers';

const FOREACH_TYPE = 'foreach';

describe('Processor: Foreach', () => {
  let onUpdate: jest.Mock;
  let testBed: SetupResult;
  const { httpSetup } = setupEnvironment();

  beforeAll(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
    // disable all react-beautiful-dnd development warnings
    (window as any)['__@hello-pangea/dnd-disable-dev-warnings'] = true;
  });

  afterAll(() => {
    jest.useRealTimers();
    // enable all react-beautiful-dnd development warnings
    (window as any)['__@hello-pangea/dnd-disable-dev-warnings'] = false;
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

    const { component, actions } = testBed;

    component.update();

    // Open flyout to add new processor
    actions.addProcessor();
    // Add type (the other fields are not visible until a type is selected)
    await actions.addProcessorType(FOREACH_TYPE);
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

  test('saves with default parameter values', async () => {
    const {
      actions: { saveNewProcessor },
      form,
    } = testBed;

    // Add "field" value
    form.setInputValue('fieldNameField.input', 'test_foreach_processor');

    // Save the field
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, FOREACH_TYPE);

    expect(processors[0][FOREACH_TYPE]).toEqual({
      field: 'test_foreach_processor',
    });
  });

  test('accepts processor definitions that contains escaped characters', async () => {
    const {
      actions: { saveNewProcessor },
      form,
      find,
      component,
    } = testBed;

    // Add "field" value
    form.setInputValue('fieldNameField.input', 'test_foreach_processor');

    await act(async () => {
      find('processorField').simulate('change', {
        jsonContent: '{"def_1":"""aaa(bbb""", "def_2":"aaa(bbb"}',
      });

      // advance timers to allow the form to validate
      jest.advanceTimersByTime(0);
    });
    component.update();

    // Save the field
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, FOREACH_TYPE);

    expect(processors[0][FOREACH_TYPE]).toEqual({
      field: 'test_foreach_processor',
      processor: { def_1: 'aaa(bbb', def_2: 'aaa(bbb' },
    });
  });
});
