/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { act } from 'react-dom/test-utils';

import { componentHelpers, MappingsEditorTestBed, nextTick } from '../helpers';
import { getFieldConfig } from '../../../lib';

const { setup, getDataForwardedFactory } = componentHelpers.mappingsEditor;
const onUpdateHandler = jest.fn();
const getDataForwarded = getDataForwardedFactory(onUpdateHandler);

describe('text datatype', () => {
  let testBed: MappingsEditorTestBed;

  /**
   * Variable to store the mappings data forwarded to the consumer component
   */
  let data: any;

  afterEach(() => {
    onUpdateHandler.mockReset();
  });

  test('flyout details initial view', async () => {
    const defaultMappings = {
      properties: {
        user: {
          properties: {
            address: {
              properties: {
                street: { type: 'text' },
              },
            },
          },
        },
      },
    };

    await act(async () => {
      testBed = await setup({ defaultValue: defaultMappings, onUpdate: onUpdateHandler });
      // Make sure all the fields are expanded and present in the DOM
      await testBed.actions.expandAllFields();
    });

    const {
      find,
      actions: { startEditField, getToggleValue, showAdvancedSettings, updateFieldAndCloseFlyout },
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

    // It should have searchable ("index" param) active by default
    const indexFieldConfig = getFieldConfig('index');
    expect(getToggleValue('indexParameter.formRowToggle')).toBe(indexFieldConfig.defaultValue);

    // The advanced settings should be hidden initially
    expect(find('mappingsEditorFieldEdit.advancedSettings').props().style.display).toEqual('none');

    await act(async () => {
      await showAdvancedSettings();
    });

    // TODO: find a way to automate testing that all expected fields are present
    // and have their default value correctly set

    const updatedMappings = {
      _meta: {}, // Was not defined so an empty object is returned by the editor
      _source: {}, // Was not defined so an empty object is returned by the editor
      ...defaultMappings,
      properties: {
        user: {
          type: 'object', // Was not defined so it defaults to "object" type
          properties: {
            address: {
              type: 'object', // Was not defined so it defaults to "object" type
              properties: {
                street: { type: 'text' },
              },
            },
          },
        },
      },
    };

    await act(async () => {
      ({ data } = await getDataForwarded());
    });
    expect(data).toEqual(updatedMappings);

    // Save the field and close the flyout
    await act(async () => {
      await updateFieldAndCloseFlyout();
    });

    const streetField = {
      type: 'text',
      // All the default parameters values have been added
      eager_global_ordinals: false,
      fielddata: false,
      index: true,
      index_options: 'positions',
      index_phrases: false,
      norms: true,
      store: false,
    };
    updatedMappings.properties.user.properties.address.properties.street = streetField;

    ({ data } = await getDataForwarded());
    expect(data).toEqual(updatedMappings);
  });

});
