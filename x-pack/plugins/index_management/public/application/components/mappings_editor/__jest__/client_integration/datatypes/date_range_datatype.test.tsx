/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { act } from 'react-dom/test-utils';

import { componentHelpers, MappingsEditorTestBed } from '../helpers';

const { setup, getMappingsEditorDataFactory } = componentHelpers.mappingsEditor;

// Parameters automatically added to the date range datatype when saved (with the default values)
export const defaultDateRangeParameters = {
  type: 'date_range',
  coerce: true,
  index: true,
  store: false,
};

describe('Mappings editor: date range datatype', () => {
  /**
   * Variable to store the mappings data forwarded to the consumer component
   */
  let data: any;
  let onChangeHandler: jest.Mock = jest.fn();
  let getMappingsEditorData = getMappingsEditorDataFactory(onChangeHandler);
  let testBed: MappingsEditorTestBed;

  beforeAll(() => {
    jest.useFakeTimers();
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
          type: 'double_range',
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
      actions: { startEditField, updateFieldAndCloseFlyout, toggleFormRow },
    } = testBed;

    // Open the flyout to edit the field
    await startEditField('myField');

    expect(exists('formatParameter')).toBe(false);

    // Change the type to "date_range"
    await act(async () => {
      find('mappingsEditorFieldEdit.fieldSubType').simulate('change', [
        {
          label: 'Date range',
          value: 'date_range',
        },
      ]);
    });
    component.update();

    expect(exists('formatParameter')).toBe(true);
    expect(exists('formatParameter.formatInput')).toBe(false);
    toggleFormRow('formatParameter');
    expect(exists('formatParameter.formatInput')).toBe(true);

    await act(async () => {
      find('formatParameter.formatInput').simulate('change', [{ label: 'customDateFormat' }]);
    });
    component.update();

    await updateFieldAndCloseFlyout();

    // It should have the default parameters values added, plus the scaling factor
    updatedMappings.properties.myField = {
      ...defaultDateRangeParameters,
      format: 'customDateFormat',
    } as any;

    ({ data } = await getMappingsEditorData(component));
    expect(data).toEqual(updatedMappings);
  });
});
