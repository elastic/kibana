/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setup, SetupResult, getProcessorValue, setupEnvironment } from './processor.helpers';

const REDACT_TYPE = 'redact';

describe('Processor: Redact', () => {
  let onUpdate: jest.Mock;
  let testBed: SetupResult;
  let clickAddPattern: () => Promise<void>;
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

    const { find, component, actions } = testBed;

    clickAddPattern = async () => {
      await act(async () => {
        find('droppableList.addButton').simulate('click');
      });
      component.update();
    };

    component.update();

    // Open flyout to add new processor
    actions.addProcessor();
    // Add type (the other fields are not visible until a type is selected)
    await actions.addProcessorType(REDACT_TYPE);
  });

  test('prevents form submission if required fields are not provided', async () => {
    const {
      actions: { saveNewProcessor },
      form,
    } = testBed;

    // Click submit button with only the type defined
    await saveNewProcessor();

    // Expect form error as "field" is a required parameter
    expect(form.getErrorsMessages()).toEqual([
      'A field value is required.', // "Field" input
      'A value is required.', // First input in "Patterns" list
    ]);
  });

  test('saves with default parameter values', async () => {
    const {
      actions: { saveNewProcessor },
      form,
    } = testBed;

    // Add "field" value
    form.setInputValue('fieldNameField.input', 'test_redact_processor');

    // Add pattern 1
    form.setInputValue('droppableList.input-0', 'pattern1');

    // Add pattern 2
    await clickAddPattern();
    form.setInputValue('droppableList.input-1', 'pattern2');

    // Save the field
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, REDACT_TYPE);

    expect(processors[0][REDACT_TYPE]).toEqual({
      field: 'test_redact_processor',
      patterns: ['pattern1', 'pattern2'],
    });
  });

  test('saves with optional parameter values', async () => {
    const {
      actions: { saveNewProcessor },
      component,
      find,
      form,
    } = testBed;

    // Add "field" value
    form.setInputValue('fieldNameField.input', 'test_redact_processor');

    // Add one pattern to the list
    form.setInputValue('droppableList.input-0', 'pattern1');

    // Set suffix and prefix
    form.setInputValue('prefixField.input', '$');
    form.setInputValue('suffixField.input', '$');

    await act(async () => {
      find('patternDefinitionsField').simulate('change', {
        jsonContent: JSON.stringify({ GITHUB_NAME: '@%{USERNAME}' }),
      });

      // advance timers to allow the form to validate
      jest.advanceTimersByTime(0);
    });
    component.update();

    // Save the field
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, REDACT_TYPE);

    expect(processors[0][REDACT_TYPE]).toEqual({
      field: 'test_redact_processor',
      patterns: ['pattern1'],
      suffix: '$',
      prefix: '$',
      pattern_definitions: { GITHUB_NAME: '@%{USERNAME}' },
    });
  });
  test('accepts pattern definitions that contains escaped characters', async () => {
    const {
      actions: { saveNewProcessor },
      component,
      find,
      form,
    } = testBed;

    // Add "field" value
    form.setInputValue('fieldNameField.input', 'test_redact_processor');

    // Add one pattern to the list
    form.setInputValue('droppableList.input-0', 'pattern1');

    await act(async () => {
      find('patternDefinitionsField').simulate('change', {
        jsonContent: '{"pattern_1":"""aaa(bbb""", "pattern_2":"aaa(bbb"}',
      });

      // advance timers to allow the form to validate
      jest.advanceTimersByTime(0);
    });
    component.update();

    // Save the field
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, REDACT_TYPE);

    expect(processors[0][REDACT_TYPE]).toEqual({
      field: 'test_redact_processor',
      patterns: ['pattern1'],
      pattern_definitions: { pattern_1: 'aaa(bbb', pattern_2: 'aaa(bbb' },
    });
  });
});
