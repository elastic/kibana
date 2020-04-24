/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { act } from 'react-dom/test-utils';

import { componentHelpers, MappingsEditorTestBed } from '../helpers';
import { getFieldConfig } from '../../../lib';

const { setup, getDataForwardedFactory } = componentHelpers.mappingsEditor;
const onUpdateHandler = jest.fn();
const getDataForwarded = getDataForwardedFactory(onUpdateHandler);

// Parameters automatically added to the text datatype when saved (with their default values)
const defaultTextParameters = {
  eager_global_ordinals: false,
  fielddata: false,
  index: true,
  index_options: 'positions',
  index_phrases: false,
  norms: true,
  store: false,
};

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
      testBed = await setup({ value: defaultMappings, onUpdate: onUpdateHandler });
      // Make sure all the fields are expanded and present in the DOM
      await testBed.actions.expandAllFieldsAndReturnMetadata();
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
      ...defaultTextParameters,
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
        myTextField: {
          type: 'text',
          // Should have 2 dropdown selects:
          // The first one set to 'language' and the second one set to 'french
          search_quote_analyzer: 'french',
        },
      },
    };

    let updatedMappings: any = {
      ...defaultMappings,
      properties: {
        myTextField: {
          ...defaultMappings.properties.myTextField,
          ...defaultTextParameters,
        },
      },
    };

    testBed = await setup({ value: defaultMappings, onUpdate: onUpdateHandler });

    const {
      find,
      exists,
      waitFor,
      waitForFn,
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

    expect(data).toEqual(updatedMappings);

    // Re-open the edit panel
    await startEditField(fieldToEdit);
    await showAdvancedSettings();

    // When no analyzer is defined, defaults to "Index default"
    let indexAnalyzerValue = find('indexAnalyzer.select').props().value;
    expect(indexAnalyzerValue).toEqual('index_default');

    const searchQuoteAnalyzerSelects = find('searchQuoteAnalyzer.select');

    expect(searchQuoteAnalyzerSelects.length).toBe(2);
    expect(searchQuoteAnalyzerSelects.at(0).props().value).toBe('language');
    expect(searchQuoteAnalyzerSelects.at(1).props().value).toBe(
      defaultMappings.properties.myTextField.search_quote_analyzer
    );

    // When no "search_analyzer" is defined, the checkBox should be checked
    let isUseSameAnalyzerForSearchChecked = getCheckboxValue(
      'useSameAnalyzerForSearchCheckBox.input'
    );
    expect(isUseSameAnalyzerForSearchChecked).toBe(true);

    // And the search analyzer select should not exist
    expect(exists('searchAnalyzer')).toBe(false);

    // Uncheck the "Use same analyzer for search" checkbox and wait for the search analyzer select
    await act(async () => {
      selectCheckBox('useSameAnalyzerForSearchCheckBox.input', false);
      await waitFor('searchAnalyzer');
    });

    let searchAnalyzerValue = find('searchAnalyzer.select').props().value;
    expect(searchAnalyzerValue).toEqual('index_default');

    await act(async () => {
      // Change the value of the 3 analyzers
      setSelectValue('indexAnalyzer.select', 'standard');
      setSelectValue('searchAnalyzer.select', 'simple');
      setSelectValue(find('searchQuoteAnalyzer.select').at(0), 'whitespace');
    });

    // Make sure the second dropdown select has been removed
    await waitForFn(
      async () => find('searchQuoteAnalyzer.select').length === 1,
      'Error waiting for the second dropdown select of search quote analyzer to be removed'
    );

    await act(async () => {
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

    isUseSameAnalyzerForSearchChecked = getCheckboxValue('useSameAnalyzerForSearchCheckBox.input');
    expect(isUseSameAnalyzerForSearchChecked).toBe(false);

    indexAnalyzerValue = find('indexAnalyzer.select').props().value;
    searchAnalyzerValue = find('searchAnalyzer.select').props().value;
    const searchQuoteAnalyzerValue = find('searchQuoteAnalyzer.select').props().value;

    expect(indexAnalyzerValue).toBe('standard');
    expect(searchAnalyzerValue).toBe('simple');
    expect(searchQuoteAnalyzerValue).toBe('whitespace');
  }, 30000);

  test('analyzer parameter: custom analyzer (external plugin)', async () => {
    const defaultMappings = {
      _meta: {},
      _source: {},
      properties: {
        myTextField: {
          type: 'text',
          analyzer: 'myCustomIndexAnalyzer',
          search_analyzer: 'myCustomSearchAnalyzer',
          search_quote_analyzer: 'myCustomSearchQuoteAnalyzer',
        },
      },
    };

    let updatedMappings: any = {
      ...defaultMappings,
      properties: {
        myTextField: {
          ...defaultMappings.properties.myTextField,
          ...defaultTextParameters,
        },
      },
    };

    testBed = await setup({ value: defaultMappings, onUpdate: onUpdateHandler });

    const {
      find,
      exists,
      waitFor,
      form: { setInputValue, setSelectValue },
      actions: { startEditField, showAdvancedSettings, updateFieldAndCloseFlyout },
    } = testBed;
    const fieldToEdit = 'myTextField';

    await startEditField(fieldToEdit);
    await showAdvancedSettings();

    expect(exists('indexAnalyzer-custom')).toBe(true);
    expect(exists('searchAnalyzer-custom')).toBe(true);
    expect(exists('searchQuoteAnalyzer-custom')).toBe(true);

    const indexAnalyzerValue = find('indexAnalyzer-custom.input').props().value;
    const searchAnalyzerValue = find('searchAnalyzer-custom.input').props().value;
    const searchQuoteAnalyzerValue = find('searchQuoteAnalyzer-custom.input').props().value;

    expect(indexAnalyzerValue).toBe(defaultMappings.properties.myTextField.analyzer);
    expect(searchAnalyzerValue).toBe(defaultMappings.properties.myTextField.search_analyzer);
    expect(searchQuoteAnalyzerValue).toBe(
      defaultMappings.properties.myTextField.search_quote_analyzer
    );

    const updatedIndexAnalyzer = 'updatedAnalyzer';
    const updatedSearchAnalyzer = 'whitespace';

    await act(async () => {
      // Change the index analyzer to another custom one
      setInputValue('indexAnalyzer-custom.input', updatedIndexAnalyzer);

      // Change the search analyzer to a built-in analyzer
      find('searchAnalyzer-toggleCustomButton').simulate('click');
      await waitFor('searchAnalyzer');
      setSelectValue('searchAnalyzer.select', updatedSearchAnalyzer);

      // Change the searchQuote to use built-in analyzer
      // By default it means using the "index default"
      find('searchQuoteAnalyzer-toggleCustomButton').simulate('click');
      await waitFor('searchQuoteAnalyzer');

      // Save & close
      await updateFieldAndCloseFlyout();
      ({ data } = await getDataForwarded());
    });

    updatedMappings = {
      ...updatedMappings,
      properties: {
        myTextField: {
          ...updatedMappings.properties.myTextField,
          analyzer: updatedIndexAnalyzer,
          search_analyzer: updatedSearchAnalyzer,
          search_quote_analyzer: undefined, // Index default means not declaring the analyzer
        },
      },
    };

    expect(data).toEqual(updatedMappings);
  });

  test('analyzer parameter: custom analyzer (from index settings)', async () => {
    const indexSettings = {
      analysis: {
        analyzer: {
          customAnalyzer_1: {},
          customAnalyzer_2: {},
          customAnalyzer_3: {},
        },
      },
    };

    const customAnalyzers = Object.keys(indexSettings.analysis.analyzer);

    const defaultMappings = {
      _meta: {},
      _source: {},
      properties: {
        myTextField: {
          type: 'text',
          analyzer: customAnalyzers[0],
        },
      },
    };

    let updatedMappings: any = {
      ...defaultMappings,
      properties: {
        myTextField: {
          ...defaultMappings.properties.myTextField,
          ...defaultTextParameters,
        },
      },
    };

    testBed = await setup({
      value: defaultMappings,
      onUpdate: onUpdateHandler,
      indexSettings,
    });

    const {
      find,
      form: { setSelectValue },
      actions: { startEditField, showAdvancedSettings, updateFieldAndCloseFlyout },
    } = testBed;
    const fieldToEdit = 'myTextField';

    await startEditField(fieldToEdit);
    await showAdvancedSettings();

    // It should have 2 selects
    const indexAnalyzerSelects = find('indexAnalyzer.select');

    expect(indexAnalyzerSelects.length).toBe(2);
    expect(indexAnalyzerSelects.at(0).props().value).toBe('custom');
    expect(indexAnalyzerSelects.at(1).props().value).toBe(
      defaultMappings.properties.myTextField.analyzer
    );

    // Access the list of option of the second dropdown select
    const subSelectOptions = indexAnalyzerSelects
      .at(1)
      .find('option')
      .map(wrapper => wrapper.text());

    expect(subSelectOptions).toEqual(customAnalyzers);

    await act(async () => {
      // Change the custom analyzer dropdown to another one from the index settings
      setSelectValue(find('indexAnalyzer.select').at(1), customAnalyzers[2]);

      // Save & close
      await updateFieldAndCloseFlyout();
      ({ data } = await getDataForwarded());
    });

    updatedMappings = {
      ...updatedMappings,
      properties: {
        myTextField: {
          ...updatedMappings.properties.myTextField,
          analyzer: customAnalyzers[2],
        },
      },
    };

    expect(data).toEqual(updatedMappings);
  });
});
