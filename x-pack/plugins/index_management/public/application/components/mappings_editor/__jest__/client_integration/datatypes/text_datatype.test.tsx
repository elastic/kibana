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

  test('analyzer parameter: default values', async () => {
    const defaultMappings = {
      _meta: {},
      _source: {},
      properties: {
        myTextField: { type: 'text' },
      },
    };

    let updatedMappings: any = { ...defaultMappings };

    testBed = await setup({ defaultValue: defaultMappings, onUpdate: onUpdateHandler });
    // Make sure all the fields are expanded and present in the DOM
    await testBed.actions.expandAllFields();

    const {
      find,
      exists,
      waitFor,
      form: { selectCheckBox, setSelectValue },
      actions: {
        startEditField,
        getCheckboxValue,
        showAdvancedSettings,
        updateFieldAndCloseFlyout,
      },
    } = testBed;
    const fieldToEdit = 'myTextField';

    // Start edit and immediately save to have all the default values
    await startEditField(fieldToEdit);
    await showAdvancedSettings();

    await act(async () => {
      await updateFieldAndCloseFlyout();
      ({ data } = await getDataForwarded());
    });

    updatedMappings = {
      ...updatedMappings,
      properties: {
        myTextField: {
          ...updatedMappings.properties.myTextField,
          eager_global_ordinals: false,
          fielddata: false,
          index: true,
          index_options: 'positions',
          index_phrases: false,
          norms: true,
          store: false,
        },
      },
    };

    expect(data).toEqual(updatedMappings);

    // Start edit
    await startEditField(fieldToEdit);
    await showAdvancedSettings();

    // When no analyzer is defined, defaults to "Index default"
    let indexAnalyzerValue = find('analyzerParameters.indexAnalyzer.select').props().value;
    expect(indexAnalyzerValue).toEqual('index_default');

    let searchQuoteAnalyzerValue = find('analyzerParameters.searchQuoteAnalyzer.select').props()
      .value;
    expect(searchQuoteAnalyzerValue).toEqual('index_default');

    // When no "search_analyzer" is defined, the checkBox should be checked
    let isUseSameAnalyzerForSearchChecked = getCheckboxValue(
      'analyzerParameters.useSameAnalyzerForSearchCheckBox.input'
    );
    expect(isUseSameAnalyzerForSearchChecked).toBe(true);

    // And the search analyzer select should not exist
    expect(exists('analyzerParameters.searchAnalyzer')).toBe(false);

    // Uncheck the "Use same analyzer for search" checkbox and wait for the select
    await act(async () => {
      selectCheckBox('analyzerParameters.useSameAnalyzerForSearchCheckBox.input', false);
      await waitFor('analyzerParameters.searchAnalyzer');
    });

    let searchAnalyzerValue = find('analyzerParameters.searchQuoteAnalyzer.select').props().value;
    expect(searchAnalyzerValue).toEqual('index_default');

    await act(async () => {
      // Change the value of the 3 analyzers
      setSelectValue('analyzerParameters.indexAnalyzer.select', 'standard');
      setSelectValue('analyzerParameters.searchAnalyzer.select', 'simple');
      setSelectValue('analyzerParameters.searchQuoteAnalyzer.select', 'whitespace');

      // Save & close
      await updateFieldAndCloseFlyout();
    });

    updatedMappings = {
      ...updatedMappings,
      properties: {
        myTextField: {
          ...updatedMappings.properties.myTextField,
          analyzer: 'standard',
          search_analyzer: 'simple',
          search_quote_analyzer: 'whitespace',
        },
      },
    };

    ({ data } = await getDataForwarded());
    expect(data).toEqual(updatedMappings);

    // Re-open the flyout and make sure the select have the correct updated value
    await startEditField(fieldToEdit);
    await showAdvancedSettings();

    isUseSameAnalyzerForSearchChecked = getCheckboxValue(
      'analyzerParameters.useSameAnalyzerForSearchCheckBox.input'
    );
    expect(isUseSameAnalyzerForSearchChecked).toBe(false);

    indexAnalyzerValue = find('analyzerParameters.indexAnalyzer.select').props().value;
    searchAnalyzerValue = find('analyzerParameters.searchAnalyzer.select').props().value;
    searchQuoteAnalyzerValue = find('analyzerParameters.searchQuoteAnalyzer.select').props().value;

    expect(indexAnalyzerValue).toBe('standard');
    expect(searchAnalyzerValue).toBe('simple');
    expect(searchQuoteAnalyzerValue).toBe('whitespace');
  }, 30000);
});
