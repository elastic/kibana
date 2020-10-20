/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { act } from 'react-dom/test-utils';

import { componentHelpers, MappingsEditorTestBed } from '../helpers';

const { setup, getMappingsEditorDataFactory } = componentHelpers.mappingsEditor;

// Parameters automatically added to the version datatype when saved (with the default values)
export const defaultVersionParameters = {
  type: 'version',
};

describe('Mappings editor: version datatype', () => {
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

  test('supports meta parameter', async () => {
    const defaultMappings = {
      properties: {
        myField: {
          type: 'version',
        },
      },
    };

    const updatedMappings = { ...defaultMappings };

    const metaParameter = {
      meta: {
        my_metadata: 'foobar',
      },
    };

    await act(async () => {
      testBed = setup({ value: defaultMappings, onChange: onChangeHandler });
    });
    testBed.component.update();

    const {
      component,
      actions: {
        startEditField,
        updateFieldAndCloseFlyout,
        showAdvancedSettings,
        toggleFormRow,
        updateJsonEditor,
      },
    } = testBed;

    // Open the flyout to edit the field
    await startEditField('myField');
    await showAdvancedSettings();

    // Enable the meta parameter and provide a valid object
    toggleFormRow('metaParameter');
    await act(async () => {
      updateJsonEditor('metaParameterEditor', metaParameter.meta);
    });
    component.update();

    // Save the field and close the flyout
    await updateFieldAndCloseFlyout();

    // It should have the default parameters values added, plus metadata
    updatedMappings.properties.myField = {
      ...defaultVersionParameters,
      ...metaParameter,
    };

    ({ data } = await getMappingsEditorData(component));
    expect(data).toEqual(updatedMappings);
  });
});
