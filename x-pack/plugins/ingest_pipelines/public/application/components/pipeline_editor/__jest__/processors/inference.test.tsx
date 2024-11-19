/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setup, SetupResult, getProcessorValue, setupEnvironment } from './processor.helpers';

const INFERENCE_TYPE = 'inference';

describe('Processor: Script', () => {
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
    await actions.addProcessorType(INFERENCE_TYPE);
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
      'A deployment, an inference, or a model ID value is required.',
    ]);
  });

  test('accepts inference config and field maps that contains escaped characters', async () => {
    const {
      actions: { saveNewProcessor },
      find,
      form,
      component,
    } = testBed;

    form.setInputValue('inferenceModelId.input', 'test_inference_processor');

    await act(async () => {
      find('inferenceConfig').simulate('change', {
        jsonContent: '{"inf_conf_1":"""aaa(bbb""", "inf_conf_2": "aaa(bbb"}',
      });

      // advance timers to allow the form to validate
      jest.advanceTimersByTime(0);
    });
    component.update();

    await act(async () => {
      find('fieldMap').simulate('change', {
        jsonContent: '{"field_map_1":"""aaa(bbb""", "field_map_2": "aaa(bbb"}',
      });

      // advance timers to allow the form to validate
      jest.advanceTimersByTime(0);
    });
    component.update();

    // Save the field
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, INFERENCE_TYPE);

    expect(processors[0][INFERENCE_TYPE]).toEqual({
      model_id: 'test_inference_processor',
      inference_config: { inf_conf_1: 'aaa(bbb', inf_conf_2: 'aaa(bbb' },
      field_map: { field_map_1: 'aaa(bbb', field_map_2: 'aaa(bbb' },
    });
  });
});
