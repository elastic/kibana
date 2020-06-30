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

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

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

    testBed = setup({ value: defaultMappings, onChange: onChangeHandler });
    await testBed.actions.expandAllFieldsAndReturnMetadata();

    const {
      find,
      actions: { startEditField },
    } = testBed;
    // Open the flyout to edit the field
    startEditField('user.address.street');

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
        userName: {
          ...defaultTextParameters,
        },
      },
    };

    testBed = setup({ value: defaultMappings, onChange: onChangeHandler });

    const {
      find,
      exists,
      component,
      actions: { startEditField, updateFieldAndCloseFlyout },
    } = testBed;

    expect(exists('userNameField' as any)).toBe(true);
    // Open the flyout, change the field type and save it
    startEditField('userName');

    // Change the field type
    find('mappingsEditorFieldEdit.fieldType').simulate('change', [
      { label: 'Shape', value: defaultShapeParameters.type },
    ]);
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await updateFieldAndCloseFlyout();

    const { data } = await getMappingsEditorData(component);

    const updatedMappings = {
      ...defaultMappings,
      properties: {
        userName: {
          ...defaultShapeParameters,
        },
      },
    };

    expect(data).toEqual(updatedMappings);
  }, 50000);
});
