/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { componentHelpers, MappingsEditorTestBed } from '../helpers';

const { setup, getMappingsEditorDataFactory } = componentHelpers.mappingsEditor;
const onChangeHandler = jest.fn();
const getMappingsEditorData = getMappingsEditorDataFactory(onChangeHandler);

// Parameters automatically added to the shape datatype when saved (with the default values)
export const defaultShapeParameters = {
  type: 'shape',
  coerce: false,
  ignore_malformed: false,
  ignore_z_value: true,
};

describe('Mappings editor: shape datatype', () => {
  let testBed: MappingsEditorTestBed;

  /**
   * Variable to store the mappings data forwarded to the consumer component
   */
  let data: any;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test('initial view and default parameters values', async () => {
    const defaultMappings = {
      _meta: {},
      _source: {},
      properties: {
        myField: {
          type: 'shape',
        },
      },
    };

    const updatedMappings = { ...defaultMappings };

    testBed = setup({ value: defaultMappings, onChange: onChangeHandler });

    const {
      component,
      actions: { startEditField, updateFieldAndCloseFlyout },
    } = testBed;

    // Open the flyout to edit the field
    startEditField('myField');

    // Save the field and close the flyout
    await updateFieldAndCloseFlyout();

    // It should have the default parameters values added
    updatedMappings.properties.myField = defaultShapeParameters;

    ({ data } = await getMappingsEditorData(component));
    expect(data).toEqual(updatedMappings);
  });
});
