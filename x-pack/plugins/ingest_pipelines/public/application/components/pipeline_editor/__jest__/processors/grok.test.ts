/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setup, SetupResult, getProcessorValue, setupEnvironment } from './processor.helpers';

const GROK_TYPE = 'grok';

describe('Processor: Grok', () => {
  let onUpdate: jest.Mock;
  let testBed: SetupResult;
  let clickAddPattern: () => Promise<void>;
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
    await actions.addProcessorType(GROK_TYPE);
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
    form.setInputValue('fieldNameField.input', 'test_grok_processor');

    // Add pattern 1
    form.setInputValue('droppableList.input-0', 'pattern1');

    // Add pattern 2
    await clickAddPattern();
    form.setInputValue('droppableList.input-1', 'pattern2');

    // Add pattern 3
    await clickAddPattern();
    form.setInputValue('droppableList.input-2', 'pattern3');

    // Save the field
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, GROK_TYPE);

    expect(processors[0][GROK_TYPE]).toEqual({
      field: 'test_grok_processor',
      patterns: ['pattern1', 'pattern2', 'pattern3'],
    });
  });

  test('accepts grok pattern that contains escaped characters', async () => {
    const {
      actions: { saveNewProcessor },
      form,
    } = testBed;

    // Add "field" value
    form.setInputValue('fieldNameField.input', 'test_grok_processor');

    // Add the escaped value of \[%{HTTPDATE:timestamp}\]%{SPACE}\"%{WORD:http_method}%{SPACE}HTTP/%{NUMBER:http_version}\"
    const escapedValue =
      '\\[%{HTTPDATE:timestamp}\\]%{SPACE}\\"%{WORD:http_method}%{SPACE}HTTP/%{NUMBER:http_version}\\"';
    form.setInputValue('droppableList.input-0', escapedValue);

    // Save the field
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, GROK_TYPE);

    expect(processors[0][GROK_TYPE].patterns).toEqual([escapedValue]);
  });

  test('accepts pattern definitions that contains escaped characters', async () => {
    const {
      actions: { saveNewProcessor },
      form,
      find,
      component,
    } = testBed;

    // Add "field" value
    form.setInputValue('fieldNameField.input', 'test_grok_processor');

    // Add pattern 1
    form.setInputValue('droppableList.input-0', 'pattern1');

    await act(async () => {
      find('patternDefinitionsField').simulate('change', {
        jsonContent: '{"def_1":"""aaa(bbb"""}',
      });

      // advance timers to allow the form to validate
      jest.advanceTimersByTime(0);
    });
    component.update();

    // Save the field
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, GROK_TYPE);

    expect(processors[0][GROK_TYPE]).toEqual({
      field: 'test_grok_processor',
      patterns: ['pattern1'],
      pattern_definitions: { def_1: 'aaa(bbb' },
    });
  });
});
