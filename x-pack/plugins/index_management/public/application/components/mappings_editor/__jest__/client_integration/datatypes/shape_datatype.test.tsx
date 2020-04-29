/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act } from 'react-dom/test-utils';

import { componentHelpers, MappingsEditorTestBed } from '../helpers';

const { setup, getDataForwardedFactory } = componentHelpers.mappingsEditor;
const onChangeHandler = jest.fn();
const getDataForwarded = getDataForwardedFactory(onChangeHandler);

// Parameters automatically added to the shape datatype when saved (with the default values)
export const defaultShapeParameters = {
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

    await act(async () => {
      testBed = await setup({ value: defaultMappings, onChange: onChangeHandler });
    });

    const {
      exists,
      waitFor,
      waitForFn,
      actions: { startEditField, updateFieldAndCloseFlyout },
    } = testBed;

    // Open the flyout to edit the field
    await act(async () => {
      await startEditField('myField');
    });

    await waitFor('mappingsEditorFieldEdit');

    // Save the field and close the flyout
    await act(async () => {
      await updateFieldAndCloseFlyout();
    });

    await waitForFn(
      async () => exists('mappingsEditorFieldEdit') === false,
      'Error waiting for the details flyout to close'
    );

    // It should have the default parameters values added
    updatedMappings.properties.myField = {
      type: 'shape',
      ...defaultShapeParameters,
    };

    ({ data } = await getDataForwarded());
    expect(data).toEqual(updatedMappings);
  });
});
