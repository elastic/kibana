/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { componentHelpers, MappingsEditorTestBed } from '../helpers';

const { setup, getMappingsEditorDataFactory } = componentHelpers.mappingsEditor;

describe('Mappings editor: other datatype', () => {
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

  test('allow to add custom field type', async () => {
    await act(async () => {
      testBed = setup({ onChange: onChangeHandler });
    });
    testBed.component.update();

    const {
      component,
      actions: { addField },
    } = testBed;

    await addField('myField', 'other', 'customType');

    const mappings = {
      properties: {
        myField: {
          type: 'customType',
        },
      },
    };

    ({ data } = await getMappingsEditorData(component));
    expect(data).toEqual(mappings);
  });

  test('allow to change a field type to a custom type', async () => {
    const defaultMappings = {
      properties: {
        myField: {
          type: 'text',
        },
      },
    };

    let updatedMappings = { ...defaultMappings };

    await act(async () => {
      testBed = setup({ value: defaultMappings, onChange: onChangeHandler });
    });
    testBed.component.update();

    const {
      component,
      find,
      form,
      actions: { startEditField, updateFieldAndCloseFlyout },
    } = testBed;

    // Open the flyout to edit the field
    await startEditField('myField');

    // Change the field type
    await act(async () => {
      find('mappingsEditorFieldEdit.fieldType').simulate('change', [
        {
          label: 'other',
          value: 'other',
        },
      ]);
    });
    component.update();

    form.setInputValue('mappingsEditorFieldEdit.fieldSubType', 'customType');

    // Save the field and close the flyout
    await updateFieldAndCloseFlyout();

    updatedMappings = {
      properties: {
        myField: {
          type: 'customType',
        },
      },
    };

    ({ data } = await getMappingsEditorData(component));
    expect(data).toEqual(updatedMappings);
  });
});
