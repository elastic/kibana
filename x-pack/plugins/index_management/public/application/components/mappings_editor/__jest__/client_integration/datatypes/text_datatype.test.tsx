/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { act } from 'react-dom/test-utils';

import { componentHelpers, MappingsEditorTestBed } from '../helpers';
import { getFieldConfig } from '../../../lib';

const { setup, getMappingsEditorDataFactory } = componentHelpers.mappingsEditor;
const onChangeHandler = jest.fn();
const getMappingsEditorData = getMappingsEditorDataFactory(onChangeHandler);

// Parameters automatically added to the text datatype when saved (with the default values)
export const defaultTextParameters = {
  type: 'text',
  eager_global_ordinals: false,
  fielddata: false,
  index: true,
  index_options: 'positions',
  index_phrases: false,
  norms: true,
  store: false,
};

describe('Mappings editor: text datatype', () => {
  let testBed: MappingsEditorTestBed;

  /**
   * Variable to store the mappings data forwarded to the consumer component
   */
  let data: any;

  afterEach(() => {
    onChangeHandler.mockReset();
  });

  test('initial view and default parameters values', async () => {
    const defaultMappings = {
      _meta: {},
      _source: {},
      properties: {
        myField: {
          type: 'text',
        },
      },
    };

    const updatedMappings = { ...defaultMappings };

    await act(async () => {
      testBed = await setup({ value: defaultMappings, onChange: onChangeHandler });
    });

    const {
      exists,
      waitFor,
      waitForFn,
      actions: { startEditField, getToggleValue, updateFieldAndCloseFlyout },
    } = testBed;

    // Open the flyout to edit the field
    await act(async () => {
      startEditField('myField');
    });

    await waitFor('mappingsEditorFieldEdit');

    // It should have searchable ("index" param) active by default
    const indexFieldConfig = getFieldConfig('index');
    expect(getToggleValue('indexParameter.formRowToggle')).toBe(indexFieldConfig.defaultValue);

    // Save the field and close the flyout
    await act(async () => {
      updateFieldAndCloseFlyout();
    });

    await waitForFn(
      async () => exists('mappingsEditorFieldEdit') === false,
      'Error waiting for the details flyout to close'
    );

    // It should have the default parameters values added
    updatedMappings.properties.myField = {
      type: 'text',
      ...defaultTextParameters,
    };

    ({ data } = await getMappingsEditorData());
    expect(data).toEqual(updatedMappings);
  }, 30000);

  test('analyzer parameter: default values', async () => {
    const defaultMappings = {
      _meta: {},
      _source: {},
      properties: {
        myField: {
          type: 'text',
          // Should have 2 dropdown selects:
          // The first one set to 'language' and the second one set to 'french
          search_quote_analyzer: 'french',
        },
      },
    };

    testBed = await setup({ value: defaultMappings, onChange: onChangeHandler });

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
    const fieldToEdit = 'myField';

    // Start edit and immediately save to have all the default values
    await act(async () => {
      startEditField(fieldToEdit);
    });
    await waitFor('mappingsEditorFieldEdit');
    await showAdvancedSettings();

    await act(async () => {
      updateFieldAndCloseFlyout();
    });

    await waitForFn(
      async () => exists('mappingsEditorFieldEdit') === false,
      'Error waiting for the details flyout to close'
    );

    ({ data } = await getMappingsEditorData());

    let updatedMappings: any = {
      ...defaultMappings,
      properties: {
        myField: {
          ...defaultMappings.properties.myField,
          ...defaultTextParameters,
        },
      },
    };
    expect(data).toEqual(updatedMappings);

    // Re-open the edit panel
    await act(async () => {
      startEditField('myField');
    });
    await waitFor('mappingsEditorFieldEdit');
    await showAdvancedSettings();

    // When no analyzer is defined, defaults to "Index default"
    let indexAnalyzerValue = find('indexAnalyzer.select').props().value;
    expect(indexAnalyzerValue).toEqual('index_default');

    const searchQuoteAnalyzerSelects = find('searchQuoteAnalyzer.select');

    expect(searchQuoteAnalyzerSelects.length).toBe(2);
    expect(searchQuoteAnalyzerSelects.at(0).props().value).toBe('language');
    expect(searchQuoteAnalyzerSelects.at(1).props().value).toBe(
      defaultMappings.properties.myField.search_quote_analyzer
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
    });

    await waitFor('searchAnalyzer');

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
      updateFieldAndCloseFlyout();
    });

    await waitForFn(
      async () => exists('mappingsEditorFieldEdit') === false,
      'Error waiting for the details flyout to close'
    );

    updatedMappings = {
      ...updatedMappings,
      properties: {
        myField: {
          ...updatedMappings.properties.myField,
          analyzer: 'standard',
          search_analyzer: 'simple',
          search_quote_analyzer: 'whitespace',
        },
      },
    };

    ({ data } = await getMappingsEditorData());
    expect(data).toEqual(updatedMappings);

    // Re-open the flyout and make sure the select have the correct updated value
    await act(async () => {
      startEditField('myField');
    });
    await waitFor('mappingsEditorFieldEdit');
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
        myField: {
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
        myField: {
          ...defaultMappings.properties.myField,
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
      form: { setInputValue, setSelectValue },
      actions: { startEditField, showAdvancedSettings, updateFieldAndCloseFlyout },
    } = testBed;
    const fieldToEdit = 'myField';

    await act(async () => {
      startEditField(fieldToEdit);
    });

    await waitFor('mappingsEditorFieldEdit');
    await showAdvancedSettings();

    expect(exists('indexAnalyzer-custom')).toBe(true);
    expect(exists('searchAnalyzer-custom')).toBe(true);
    expect(exists('searchQuoteAnalyzer-custom')).toBe(true);

    const indexAnalyzerValue = find('indexAnalyzer-custom.input').props().value;
    const searchAnalyzerValue = find('searchAnalyzer-custom.input').props().value;
    const searchQuoteAnalyzerValue = find('searchQuoteAnalyzer-custom.input').props().value;

    expect(indexAnalyzerValue).toBe(defaultMappings.properties.myField.analyzer);
    expect(searchAnalyzerValue).toBe(defaultMappings.properties.myField.search_analyzer);
    expect(searchQuoteAnalyzerValue).toBe(defaultMappings.properties.myField.search_quote_analyzer);

    const updatedIndexAnalyzer = 'newCustomIndexAnalyzer';
    const updatedSearchAnalyzer = 'whitespace';

    await act(async () => {
      // Change the index analyzer to another custom one
      setInputValue('indexAnalyzer-custom.input', updatedIndexAnalyzer);

      // Change the search analyzer to a built-in analyzer
      find('searchAnalyzer-toggleCustomButton').simulate('click');
      component.update();
    });

    await waitFor('searchAnalyzer');

    await act(async () => {
      setSelectValue('searchAnalyzer.select', updatedSearchAnalyzer);

      // Change the searchQuote to use built-in analyzer
      // By default it means using the "index default"
      find('searchQuoteAnalyzer-toggleCustomButton').simulate('click');
      component.update();
    });

    await waitFor('searchQuoteAnalyzer');

    await act(async () => {
      // Save & close
      updateFieldAndCloseFlyout();
    });

    await waitForFn(
      async () => exists('mappingsEditorFieldEdit') === false,
      'Error waiting for the details flyout to close'
    );

    ({ data } = await getMappingsEditorData());

    updatedMappings = {
      ...updatedMappings,
      properties: {
        myField: {
          ...updatedMappings.properties.myField,
          analyzer: updatedIndexAnalyzer,
          search_analyzer: updatedSearchAnalyzer,
          search_quote_analyzer: undefined, // Index default means not declaring the analyzer
        },
      },
    };

    expect(data).toEqual(updatedMappings);
  }, 30000);

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
        myField: {
          type: 'text',
          analyzer: customAnalyzers[0],
        },
      },
    };

    let updatedMappings: any = {
      ...defaultMappings,
      properties: {
        myField: {
          ...defaultMappings.properties.myField,
          ...defaultTextParameters,
        },
      },
    };

    testBed = await setup({
      value: defaultMappings,
      onChange: onChangeHandler,
      indexSettings,
    });

    const {
      find,
      exists,
      waitFor,
      waitForFn,
      form: { setSelectValue },
      actions: { startEditField, showAdvancedSettings, updateFieldAndCloseFlyout },
    } = testBed;
    const fieldToEdit = 'myField';

    await act(async () => {
      startEditField(fieldToEdit);
    });
    await waitFor('mappingsEditorFieldEdit');
    await showAdvancedSettings();

    // It should have 2 selects
    const indexAnalyzerSelects = find('indexAnalyzer.select');

    expect(indexAnalyzerSelects.length).toBe(2);
    expect(indexAnalyzerSelects.at(0).props().value).toBe('custom');
    expect(indexAnalyzerSelects.at(1).props().value).toBe(
      defaultMappings.properties.myField.analyzer
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
      updateFieldAndCloseFlyout();
    });

    await waitForFn(
      async () => exists('mappingsEditorFieldEdit') === false,
      'Error waiting for the details flyout to close'
    );

    ({ data } = await getMappingsEditorData());

    updatedMappings = {
      ...updatedMappings,
      properties: {
        myField: {
          ...updatedMappings.properties.myField,
          analyzer: customAnalyzers[2],
        },
      },
    };

    expect(data).toEqual(updatedMappings);
  }, 30000);
});
