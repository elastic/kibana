/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { act } from 'react-dom/test-utils';

import { componentHelpers, MappingsEditorTestBed } from './helpers';
import { defaultTextParameters, defaultShapeParameters } from './datatypes';
const { setup, getMappingsEditorDataFactory } = componentHelpers.mappingsEditor;
const onChangeHandler = jest.fn();
const getMappingsEditorData = getMappingsEditorDataFactory(onChangeHandler);

describe('Mappings editor: edit field', () => {
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
    // Open the flyout to edit the field
    await act(async () => {
      startEditField('user.address.street');
    });

    await waitFor('mappingsEditorFieldEdit');

    // It should have the correct title
    expect(find('mappingsEditorFieldEdit.flyoutTitle').text()).toEqual(`Edit field 'street'`);

    // It should have the correct field path
    expect(find('mappingsEditorFieldEdit.fieldPath').text()).toEqual('user > address > street');

    // The advanced settings should be hidden initially
    expect(find('mappingsEditorFieldEdit.advancedSettings').props().style.display).toEqual('none');
  });

  test('should update form parameters when changing the field datatype', async () => {
    const defaultMappings = {
      _meta: {},
      _source: {},
      properties: {
        myField: {
          ...defaultTextParameters,
        },
      },
    };

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
      startEditField('myField');
    });

    await waitFor('mappingsEditorFieldEdit');

    await act(async () => {
      // Change the field type
      find('mappingsEditorFieldEdit.fieldType').simulate('change', [
        { label: 'Shape', value: defaultShapeParameters.type },
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

    const { data } = await getMappingsEditorData();

    const updatedMappings = {
      ...defaultMappings,
      properties: {
        myField: {
          ...defaultShapeParameters,
        },
      },
    };

    expect(data).toEqual(updatedMappings);
  }, 15000);
});
