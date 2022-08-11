/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setup, SetupResult, getProcessorValue, setupEnvironment } from './processor.helpers';

const DATE_INDEX_TYPE = 'date_index_name';

describe('Processor: Date Index Name', () => {
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
    await addProcessorType(DATE_INDEX_TYPE);
  });

  test('prevents form submission if required fields are not provided', async () => {
    const {
      actions: { saveNewProcessor },
      form,
    } = testBed;

    // Click submit button with only the type defined
    await saveNewProcessor();

    // Expect form error as "field" and "date rounding" are required parameters
    expect(form.getErrorsMessages()).toEqual([
      'A field value is required.',
      'A date rounding value is required.',
    ]);
  });

  test('saves with required field and date rounding parameter values', async () => {
    const {
      actions: { saveNewProcessor },
      form,
    } = testBed;

    // Add "field" value (required)
    form.setInputValue('fieldNameField.input', '@timestamp');

    // Select second value for date rounding
    form.setSelectValue('dateRoundingField', 's');

    // Save the field
    await saveNewProcessor();

    const processors = await getProcessorValue(onUpdate, DATE_INDEX_TYPE);
    expect(processors[0].date_index_name).toEqual({
      field: '@timestamp',
      date_rounding: 's',
    });
  });

  test('allows optional parameters to be set', async () => {
    const {
      actions: { saveNewProcessor },
      form,
      find,
      component,
    } = testBed;

    form.setInputValue('fieldNameField.input', 'field_1');

    form.setSelectValue('dateRoundingField', 'd');

    form.setInputValue('indexNamePrefixField.input', 'prefix');

    form.setInputValue('indexNameFormatField.input', 'yyyy-MM');

    await act(async () => {
      find('dateFormatsField.input').simulate('change', [{ label: 'ISO8601' }]);
    });
    component.update();

    form.setInputValue('timezoneField.input', 'GMT');

    form.setInputValue('localeField.input', 'SPANISH');
    // Save the field with new changes
    await saveNewProcessor();

    const processors = await getProcessorValue(onUpdate, DATE_INDEX_TYPE);
    expect(processors[0].date_index_name).toEqual({
      field: 'field_1',
      date_rounding: 'd',
      index_name_format: 'yyyy-MM',
      index_name_prefix: 'prefix',
      date_formats: ['ISO8601'],
      locale: 'SPANISH',
      timezone: 'GMT',
    });
  });
});
