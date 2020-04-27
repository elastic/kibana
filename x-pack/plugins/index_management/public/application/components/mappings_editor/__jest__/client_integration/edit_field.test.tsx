/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { act } from 'react-dom/test-utils';

import { componentHelpers, MappingsEditorTestBed } from './helpers';

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
      actions: { startEditField },
    } = testBed;
    const fieldPathToEdit = ['user', 'address', 'street'];
    const fieldName = fieldPathToEdit[fieldPathToEdit.length - 1];

    // Open the flyout to edit the field
    await act(async () => {
      await startEditField(fieldPathToEdit.join('.'));
    });

    // It should have the correct title
    expect(find('mappingsEditorFieldEdit.flyoutTitle').text()).toEqual(`Edit field '${fieldName}'`);

    // It should have the correct field path
    expect(find('mappingsEditorFieldEdit.fieldPath').text()).toEqual(fieldPathToEdit.join(' > '));

    // The advanced settings should be hidden initially
    expect(find('mappingsEditorFieldEdit.advancedSettings').props().style.display).toEqual('none');
  });

});
