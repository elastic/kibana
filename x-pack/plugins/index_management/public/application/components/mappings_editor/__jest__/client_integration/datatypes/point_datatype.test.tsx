/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { act } from 'react-dom/test-utils';

import { componentHelpers, MappingsEditorTestBed } from '../helpers';

const { setup, getMappingsEditorDataFactory } = componentHelpers.mappingsEditor;

// Parameters automatically added to the point datatype when saved (with the default values)
export const defaultPointParameters = {
  type: 'point',
  ignore_malformed: false,
  ignore_z_value: true,
};

describe('Mappings editor: point datatype', () => {
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

  test('initial view and default parameters values', async () => {
    const defaultMappings = {
      properties: {
        myField: {
          type: 'point',
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
      actions: { startEditField, updateFieldAndCloseFlyout },
    } = testBed;

    // Open the flyout to edit the field
    await startEditField('myField');

    // Save the field and close the flyout
    await updateFieldAndCloseFlyout();

    // It should have the default parameters values added
    updatedMappings.properties.myField = defaultPointParameters;

    ({ data } = await getMappingsEditorData(component));
    expect(data).toEqual(updatedMappings);
  });

  describe('meta parameter', () => {
    const defaultMappings = {
      properties: {
        myField: {
          type: 'point',
        },
      },
    };

    const updatedMappings = { ...defaultMappings };

    const metaParameter = {
      meta: {
        my_metadata: 'foobar',
      },
    };

    beforeEach(async () => {
      await act(async () => {
        testBed = setup({ value: defaultMappings, onChange: onChangeHandler });
      });
      testBed.component.update();
    });

    test('valid meta object', async () => {
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

      // Enable the meta parameter and add value
      toggleFormRow('metaParameter');
      await act(async () => {
        updateJsonEditor('metaParameterEditor', metaParameter.meta);
      });
      component.update();

      // Save the field and close the flyout
      await updateFieldAndCloseFlyout();

      // It should have the default parameters values added, plus metadata
      updatedMappings.properties.myField = {
        ...defaultPointParameters,
        ...metaParameter,
      };

      ({ data } = await getMappingsEditorData(component));
      expect(data).toEqual(updatedMappings);
    });

    test('strip empty string', async () => {
      const {
        component,
        actions: { startEditField, updateFieldAndCloseFlyout, showAdvancedSettings, toggleFormRow },
      } = testBed;

      // Open the flyout to edit the field
      await startEditField('myField');
      await showAdvancedSettings();

      // Enable the meta parameter
      toggleFormRow('metaParameter');

      // Save the field and close the flyout without adding any values to meta parameter
      await updateFieldAndCloseFlyout();

      // It should have the default parameters values added
      updatedMappings.properties.myField = defaultPointParameters;

      ({ data } = await getMappingsEditorData(component));
      expect(data).toEqual(updatedMappings);
    });
  });
});
