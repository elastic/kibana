/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { componentHelpers, MappingsEditorTestBed, kibanaVersion } from '../helpers';

const { setup, getMappingsEditorDataFactory } = componentHelpers.mappingsEditor;

// Parameters automatically added to the scaled float datatype when saved (with the default values)
export const defaultScaledFloatParameters = {
  type: 'scaled_float',
  coerce: true,
  doc_values: true,
  ignore_malformed: false,
  index: true,
  store: false,
};

// FLAKY: https://github.com/elastic/kibana/issues/145102
describe.skip('Mappings editor: scaled float datatype', () => {
  /**
   * Variable to store the mappings data forwarded to the consumer component
   */
  let data: any;
  let onChangeHandler: jest.Mock = jest.fn();
  let getMappingsEditorData = getMappingsEditorDataFactory(onChangeHandler);
  let testBed: MappingsEditorTestBed;

  beforeAll(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    onChangeHandler = jest.fn();
    getMappingsEditorData = getMappingsEditorDataFactory(onChangeHandler);
  });

  test('should require a scaling factor to be provided', async () => {
    const defaultMappings = {
      properties: {
        myField: {
          type: 'byte',
        },
      },
    };

    const updatedMappings = { ...defaultMappings };

    await act(async () => {
      testBed = setup({ value: defaultMappings, onChange: onChangeHandler });
    });
    testBed.component.update();

    const {
      component,
      find,
      exists,
      form,
      actions: { startEditField, updateFieldAndCloseFlyout },
    } = testBed;

    // Open the flyout to edit the field
    await startEditField('myField');

    // Change the type to "scaled_float"
    await act(async () => {
      find('mappingsEditorFieldEdit.fieldSubType').simulate('change', [
        {
          label: 'Scaled float',
          value: 'scaled_float',
        },
      ]);
    });
    component.update();

    // It should **not** allow to save as the "scaling factor" parameter has not been set
    await updateFieldAndCloseFlyout();
    expect(exists('mappingsEditorFieldEdit')).toBe(true);
    expect(form.getErrorsMessages()).toEqual(['A scaling factor is required.']);

    await act(async () => {
      form.setInputValue('scalingFactor.input', '123');
    });
    await updateFieldAndCloseFlyout();
    expect(exists('mappingsEditorFieldEdit')).toBe(false);

    if (kibanaVersion.major < 7) {
      expect(exists('boostParameterToggle')).toBe(true);
    } else {
      // Since 8.x the boost parameter is deprecated
      expect(exists('boostParameterToggle')).toBe(false);
    }

    // It should have the default parameters values added, plus the scaling factor
    updatedMappings.properties.myField = {
      ...defaultScaledFloatParameters,
      scaling_factor: 123,
    } as any;

    ({ data } = await getMappingsEditorData(component));
    expect(data).toEqual(updatedMappings);
  });
});
