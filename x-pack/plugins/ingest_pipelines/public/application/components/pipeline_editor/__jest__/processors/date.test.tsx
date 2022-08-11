/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setup, SetupResult, getProcessorValue, setupEnvironment } from './processor.helpers';

const DATE_TYPE = 'date';

describe('Processor: Date', () => {
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
    const {
      actions: { addProcessor, addProcessorType },
    } = testBed;
    // Open the processor flyout
    addProcessor();

    // Add type (the other fields are not visible until a type is selected)
    await addProcessorType(DATE_TYPE);
  });

  test('prevents form submission when field and format fields are not provided', async () => {
    const {
      actions: { saveNewProcessor },
      form,
    } = testBed;

    // Click submit button with only the type defined
    await saveNewProcessor();

    // Expect form error as "field" and "value" are required parameters
    expect(form.getErrorsMessages()).toEqual([
      'A field value is required.',
      'A value for formats is required.',
    ]);
  });

  test('saves with required field and formats parameter values', async () => {
    const {
      actions: { saveNewProcessor },
      form,
      find,
      component,
    } = testBed;

    // Add "field" value (required)
    form.setInputValue('fieldNameField.input', 'field_1');

    await act(async () => {
      find('formatsValueField.input').simulate('change', [{ label: 'ISO8601' }]);
    });
    component.update();

    // Save the field
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, DATE_TYPE);
    expect(processors[0].date).toEqual({
      field: 'field_1',
      formats: ['ISO8601'],
    });
  });

  test('allows optional parameters to be set', async () => {
    const {
      actions: { saveNewProcessor },
      form,
      find,
      component,
    } = testBed;

    // Set required parameters
    form.setInputValue('fieldNameField.input', 'field_1');

    await act(async () => {
      find('formatsValueField.input').simulate('change', [{ label: 'ISO8601' }]);
    });
    component.update();

    // Set optional parameters
    form.setInputValue('targetField.input', 'target_field');
    form.setInputValue('localeField.input', 'SPANISH');
    form.setInputValue('timezoneField.input', 'EST');
    form.setInputValue('outputFormatField.input', 'yyyy-MM-dd');

    // Save the field with new changes
    await saveNewProcessor();

    const processors = getProcessorValue(onUpdate, DATE_TYPE);
    expect(processors[0].date).toEqual({
      field: 'field_1',
      formats: ['ISO8601'],
      target_field: 'target_field',
      locale: 'SPANISH',
      timezone: 'EST',
      output_format: 'yyyy-MM-dd',
    });
  });
});
