/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { act } from 'react-dom/test-utils';

import { componentHelpers, MappingsEditorTestBed } from './helpers';
import { defaultTextParameters, defaultShapeParameters } from './datatypes';
const { setup, getDataForwardedFactory } = componentHelpers.mappingsEditor;
const onChangeHandler = jest.fn();
const getDataForwarded = getDataForwardedFactory(onChangeHandler);

describe('Mappings editor: edit field', () => {
  /**
   * Variable to store the mappings data forwarded to the consumer component
   */
  let data: any;
  let testBed: MappingsEditorTestBed;

  afterEach(() => {
    onChangeHandler.mockReset();
  });

  test('should open a flyout with the correct field to edit', async () => {
    const defaultMappings = {
      properties: {
        user: {
          type: 'object',
          properties: {
            address: {
              type: 'object',
              properties: {
                street: { type: 'text' },
              },
            },
          },
        },
      },
    };

    await act(async () => {
      testBed = await setup({ value: defaultMappings, onChange: onChangeHandler });
      // Make sure all the fields are expanded and present in the DOM
      await testBed.actions.expandAllFieldsAndReturnMetadata();
    });

    const {
      find,
      waitFor,
      actions: { startEditField },
    } = testBed;
    const fieldPathToEdit = ['user', 'address', 'street'];
    const fieldName = fieldPathToEdit[fieldPathToEdit.length - 1];

    // Open the flyout to edit the field
    await act(async () => {
      await startEditField(fieldPathToEdit.join('.'));
    });

    await waitFor('mappingsEditorFieldEdit');

    // It should have the correct title
    expect(find('mappingsEditorFieldEdit.flyoutTitle').text()).toEqual(`Edit field '${fieldName}'`);

    // It should have the correct field path
    expect(find('mappingsEditorFieldEdit.fieldPath').text()).toEqual(fieldPathToEdit.join(' > '));

    // The advanced settings should be hidden initially
    expect(find('mappingsEditorFieldEdit.advancedSettings').props().style.display).toEqual('none');
  });

  test('should update form parameters when changing the field datatype', async () => {
    const defaultMappings = {
      _meta: {},
      _source: {},
      properties: {
        myField: {
          type: 'text',
          ...defaultTextParameters,
        },
      },
    };

    let updatedMappings: any = { ...defaultMappings };

    await act(async () => {
      testBed = await setup({ value: defaultMappings, onChange: onChangeHandler });
    });

    const {
      find,
      exists,
      waitFor,
      waitForFn,
      component,
      actions: { startEditField, updateFieldAndCloseFlyout },
    } = testBed;

    // Open the flyout, change the field type and save it
    await act(async () => {
      await startEditField('myField');
    });

    await waitFor('mappingsEditorFieldEdit');

    await act(async () => {
      // Change the field type
      find('mappingsEditorFieldEdit.fieldType').simulate('change', [
        { label: 'Shape', value: 'shape' },
      ]);
      component.update();
    });

    await act(async () => {
      await updateFieldAndCloseFlyout();
    });

    await waitForFn(
      async () => exists('mappingsEditorFieldEdit') === false,
      'Error waiting for the details flyout to close'
    );

    ({ data } = await getDataForwarded());

    updatedMappings = {
      ...updatedMappings,
      properties: {
        myField: {
          type: 'shape',
          ...defaultShapeParameters,
        },
      },
    };

    expect(data).toEqual(updatedMappings);
  }, 15000);
});
