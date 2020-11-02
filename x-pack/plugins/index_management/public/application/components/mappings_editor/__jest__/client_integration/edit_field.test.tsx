/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { act } from 'react-dom/test-utils';

import { componentHelpers, MappingsEditorTestBed } from './helpers';
import { defaultTextParameters, defaultShapeParameters } from './datatypes';
const { setup, getMappingsEditorDataFactory } = componentHelpers.mappingsEditor;

describe('Mappings editor: edit field', () => {
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
      testBed = setup({ value: defaultMappings, onChange: onChangeHandler });
    });
    testBed.component.update();

    await testBed.actions.expandAllFieldsAndReturnMetadata();

    const {
      find,
      actions: { startEditField },
    } = testBed;
    // Open the flyout to edit the field
    await startEditField('user.address.street');

    // It should have the correct title
    expect(find('mappingsEditorFieldEdit.flyoutTitle').text()).toEqual(`Edit field 'street'`);

    // It should have the correct field path
    expect(find('mappingsEditorFieldEdit.fieldPath').text()).toEqual('user > address > street');

    // The advanced settings should be hidden initially
    expect(find('mappingsEditorFieldEdit.advancedSettings').props().style.display).toEqual('none');
  });

  test('should update form parameters when changing the field datatype', async () => {
    const defaultMappings = {
      properties: {
        userName: {
          ...defaultTextParameters,
        },
      },
    };

    await act(async () => {
      testBed = setup({ value: defaultMappings, onChange: onChangeHandler });
    });
    testBed.component.update();

    const {
      find,
      exists,
      component,
      actions: { startEditField, updateFieldAndCloseFlyout },
    } = testBed;

    expect(exists('userNameField' as any)).toBe(true);
    // Open the flyout, change the field type and save it
    await startEditField('userName');

    // Change the field type
    await act(async () => {
      find('mappingsEditorFieldEdit.fieldType').simulate('change', [
        { label: 'Shape', value: defaultShapeParameters.type },
      ]);
    });

    await updateFieldAndCloseFlyout();

    ({ data } = await getMappingsEditorData(component));

    const updatedMappings = {
      ...defaultMappings,
      properties: {
        userName: {
          ...defaultShapeParameters,
        },
      },
    };

    expect(data).toEqual(updatedMappings);
  });
});
