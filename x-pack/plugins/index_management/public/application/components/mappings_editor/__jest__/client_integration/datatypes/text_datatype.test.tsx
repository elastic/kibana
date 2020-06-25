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

// FLAKY: https://github.com/elastic/kibana/issues/66669
describe.skip('Mappings editor: text datatype', () => {
  let testBed: MappingsEditorTestBed;

  /**
   * Variable to store the mappings data forwarded to the consumer component
   */
  let data: any;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

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

    testBed = setup({ value: defaultMappings, onChange: onChangeHandler });

    const {
      component,
      actions: { startEditField, getToggleValue, updateFieldAndCloseFlyout },
    } = testBed;

    // Open the flyout to edit the field
    startEditField('myField');

    // It should have searchable ("index" param) active by default
    const indexFieldConfig = getFieldConfig('index');
    expect(getToggleValue('indexParameter.formRowToggle')).toBe(indexFieldConfig.defaultValue);

    // Save the field and close the flyout
    await updateFieldAndCloseFlyout();

    // It should have the default parameters values added
    updatedMappings.properties.myField = {
      ...defaultTextParameters,
    };

    ({ data } = await getMappingsEditorData(component));
    expect(data).toEqual(updatedMappings);
  }, 10000);

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

    testBed = setup({ value: defaultMappings, onChange: onChangeHandler });

    const {
      component,
      find,
      exists,
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
    startEditField(fieldToEdit);
    showAdvancedSettings();
    await updateFieldAndCloseFlyout();

    expect(exists('mappingsEditorFieldEdit')).toBe(false);

    ({ data } = await getMappingsEditorData(component));

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
    startEditField(fieldToEdit);
    showAdvancedSettings();

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

    // Uncheck the "Use same analyzer for search" checkbox and make sure the dedicated select appears
    selectCheckBox('useSameAnalyzerForSearchCheckBox.input', false);
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    component.update();

    expect(exists('searchAnalyzer.select')).toBe(true);

    let searchAnalyzerValue = find('searchAnalyzer.select').props().value;
    expect(searchAnalyzerValue).toEqual('index_default');

    // Change the value of the 3 analyzers
    await act(async () => {
      // Change the value of the 3 analyzers
      setSelectValue('indexAnalyzer.select', 'standard', false);
      setSelectValue('searchAnalyzer.select', 'simple', false);
      setSelectValue(find('searchQuoteAnalyzer.select').at(0), 'whitespace', false);
    });

    await updateFieldAndCloseFlyout();

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

    ({ data } = await getMappingsEditorData(component));
    expect(data).toEqual(updatedMappings);

    // Re-open the flyout and make sure the select have the correct updated value
    startEditField('myField');
    showAdvancedSettings();

    isUseSameAnalyzerForSearchChecked = getCheckboxValue('useSameAnalyzerForSearchCheckBox.input');
    expect(isUseSameAnalyzerForSearchChecked).toBe(false);

    indexAnalyzerValue = find('indexAnalyzer.select').props().value;
    searchAnalyzerValue = find('searchAnalyzer.select').props().value;
    const searchQuoteAnalyzerValue = find('searchQuoteAnalyzer.select').props().value;

    expect(indexAnalyzerValue).toBe('standard');
    expect(searchAnalyzerValue).toBe('simple');
    expect(searchQuoteAnalyzerValue).toBe('whitespace');
  }, 50000);

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

    testBed = setup({ value: defaultMappings, onChange: onChangeHandler });

    const {
      find,
      exists,
      component,
      form: { setInputValue, setSelectValue },
      actions: { startEditField, showAdvancedSettings, updateFieldAndCloseFlyout },
    } = testBed;
    const fieldToEdit = 'myField';

    startEditField(fieldToEdit);
    showAdvancedSettings();

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
    });

    await act(async () => {
      // Change the search analyzer to a built-in analyzer
      find('searchAnalyzer-toggleCustomButton').simulate('click');
    });
    component.update();

    await act(async () => {
      setSelectValue('searchAnalyzer.select', updatedSearchAnalyzer, false);
    });

    await act(async () => {
      // Change the searchQuote to use built-in analyzer
      // By default it means using the "index default"
      find('searchQuoteAnalyzer-toggleCustomButton').simulate('click');
    });

    await updateFieldAndCloseFlyout();

    ({ data } = await getMappingsEditorData(component));

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
  }, 100000);

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

    testBed = setup({
      value: defaultMappings,
      onChange: onChangeHandler,
      indexSettings,
    });

    const {
      component,
      find,
      form: { setSelectValue },
      actions: { startEditField, showAdvancedSettings, updateFieldAndCloseFlyout },
    } = testBed;
    const fieldToEdit = 'myField';

    startEditField(fieldToEdit);
    showAdvancedSettings();

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
      .map((wrapper) => wrapper.text());

    expect(subSelectOptions).toEqual(customAnalyzers);

    await act(async () => {
      // Change the custom analyzer dropdown to another one from the index settings
      setSelectValue(find('indexAnalyzer.select').at(1), customAnalyzers[2], false);
    });
    component.update();

    await updateFieldAndCloseFlyout();

    ({ data } = await getMappingsEditorData(component));

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
  }, 50000);
});
