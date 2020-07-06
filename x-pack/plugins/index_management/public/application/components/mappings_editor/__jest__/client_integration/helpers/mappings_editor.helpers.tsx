/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { act } from 'react-dom/test-utils';
import { ReactWrapper } from 'enzyme';

import { registerTestBed, TestBed } from '../../../../../../../../../test_utils';
import { getChildFieldsName } from '../../../lib';
import { MappingsEditor } from '../../../mappings_editor';

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');

  return {
    ...original,
    // Mocking EuiComboBox, as it utilizes "react-virtualized" for rendering search suggestions,
    // which does not produce a valid component wrapper
    EuiComboBox: (props: any) => (
      <input
        data-test-subj={props['data-test-subj'] || 'mockComboBox'}
        data-currentvalue={props.selectedOptions}
        onChange={async (syntheticEvent: any) => {
          props.onChange([syntheticEvent['0']]);
        }}
      />
    ),
    // Mocking EuiCodeEditor, which uses React Ace under the hood
    EuiCodeEditor: (props: any) => (
      <input
        data-test-subj={props['data-test-subj'] || 'mockCodeEditor'}
        data-currentvalue={props.value}
        onChange={(e: any) => {
          props.onChange(e.jsonContent);
        }}
      />
    ),
    // Mocking EuiSuperSelect to be able to easily change its value
    // with a `myWrapper.simulate('change', { target: { value: 'someValue' } })`
    EuiSuperSelect: (props: any) => (
      <input
        data-test-subj={props['data-test-subj'] || 'mockSuperSelect'}
        value={props.valueOfSelected}
        onChange={(e) => {
          props.onChange(e.target.value);
        }}
      />
    ),
  };
});

export interface DomFields {
  [key: string]: {
    type: string;
    properties?: DomFields;
    fields?: DomFields;
  };
}

const createActions = (testBed: TestBed<TestSubjects>) => {
  const { find, form, component } = testBed;

  const getFieldInfo = (testSubjectField: string): { name: string; type: string } => {
    const name = find(`${testSubjectField}-fieldName` as TestSubjects).text();
    const type = find(`${testSubjectField}-datatype` as TestSubjects).props()['data-type-value'];
    return { name, type };
  };

  const expandField = async (
    field: ReactWrapper
  ): Promise<{ hasChildren: boolean; testSubjectField: string }> => {
    /**
     * Field list item have 2 test subject assigned to them:
     * data-test-subj="fieldsListItem <uniqueTestSubjId>"
     *
     * We read the second one as it is unique.
     */
    const testSubjectField = (field.props() as any)['data-test-subj']
      .split(' ')
      .filter((subj: string) => subj !== 'fieldsListItem')[0] as string;

    const expandButton = find(`${testSubjectField}.toggleExpandButton` as TestSubjects);

    // No expand button, so this field is not expanded
    if (expandButton.length === 0) {
      return { hasChildren: false, testSubjectField };
    }

    const isExpanded = (expandButton.props()['aria-label'] as string).includes('Collapse');

    if (!isExpanded) {
      await act(async () => {
        expandButton.simulate('click');
      });
      component.update();
    }

    return { hasChildren: true, testSubjectField };
  };

  /**
   * Expand all the children of a field and return a metadata object of the fields found in the DOM.
   *
   * @param fieldName The field under wich we want to expand all the children.
   * If no fieldName is provided, we expand all the **root** level fields.
   */
  const expandAllFieldsAndReturnMetadata = async (
    fieldName?: string,
    domTreeMetadata: DomFields = {}
  ): Promise<DomFields> => {
    const fields = find(
      fieldName ? (`${fieldName}.fieldsList.fieldsListItem` as TestSubjects) : 'fieldsListItem'
    ).map((wrapper) => wrapper); // convert to Array for our for of loop below

    for (const field of fields) {
      const { hasChildren, testSubjectField } = await expandField(field);

      // Read the info from the DOM about that field and add it to our domFieldMeta
      const { name, type } = getFieldInfo(testSubjectField);
      domTreeMetadata[name] = {
        type,
      };

      if (hasChildren) {
        // Update our metadata object
        const childFieldName = getChildFieldsName(type as any)!;
        domTreeMetadata[name][childFieldName] = {};

        // Expand its children
        await expandAllFieldsAndReturnMetadata(
          testSubjectField,
          domTreeMetadata[name][childFieldName]
        );
      }
    }

    return domTreeMetadata;
  };

  // Get a nested field in the rendered DOM tree
  const getFieldAt = (path: string) => {
    const testSubject = `${path.split('.').join('')}Field`;
    return { field: find(testSubject as TestSubjects), testSubject };
  };

  const addField = (name: string, type: string) => {
    form.setInputValue('nameParameterInput', name);
    find('createFieldForm.fieldType').simulate('change', [
      {
        label: type,
        value: type,
      },
    ]);
    find('createFieldForm.addButton').simulate('click');
  };

  const startEditField = (path: string) => {
    const { testSubject } = getFieldAt(path);
    find(`${testSubject}.editFieldButton` as TestSubjects).simulate('click');
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    component.update();
  };

  const updateFieldAndCloseFlyout = async () => {
    await act(async () => {
      find('mappingsEditorFieldEdit.editFieldUpdateButton').simulate('click');
    });
    component.update();

    act(() => {
      jest.advanceTimersByTime(1000);
    });
  };

  const showAdvancedSettings = () => {
    if (find('mappingsEditorFieldEdit.advancedSettings').props().style.display === 'block') {
      // Already opened, nothing else to do
      return;
    }

    find('mappingsEditorFieldEdit.toggleAdvancedSetting').simulate('click');

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    component.update();
  };

  const selectTab = (tab: 'fields' | 'templates' | 'advanced') => {
    const index = ['fields', 'templates', 'advanced'].indexOf(tab);

    const tabElement = find('formTab').at(index);
    if (tabElement.length === 0) {
      throw new Error(`Tab not found: "${tab}"`);
    }
    tabElement.simulate('click');
  };

  const updateJsonEditor = (testSubject: TestSubjects, value: object) => {
    find(testSubject).simulate('change', { jsonContent: JSON.stringify(value) });
  };

  const getJsonEditorValue = (testSubject: TestSubjects) => {
    const value = find(testSubject).props()['data-currentvalue'];
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return { errorParsingJson: true, props: find(testSubject).props() };
      }
    }
    return value;
  };

  const getComboBoxValue = (testSubject: TestSubjects) => {
    const value = find(testSubject).props()['data-currentvalue'];
    if (value === undefined) {
      return [];
    }
    return value.map(({ label }: any) => label);
  };

  const getToggleValue = (testSubject: TestSubjects): boolean =>
    find(testSubject).props()['aria-checked'];

  const getCheckboxValue = (testSubject: TestSubjects): boolean =>
    find(testSubject).props().checked;

  return {
    selectTab,
    getFieldAt,
    addField,
    expandAllFieldsAndReturnMetadata,
    startEditField,
    updateFieldAndCloseFlyout,
    showAdvancedSettings,
    updateJsonEditor,
    getJsonEditorValue,
    getComboBoxValue,
    getToggleValue,
    getCheckboxValue,
  };
};

export const setup = (props: any = { onUpdate() {} }): MappingsEditorTestBed => {
  const setupTestBed = registerTestBed<TestSubjects>(MappingsEditor, {
    memoryRouter: {
      wrapComponent: false,
    },
    defaultProps: props,
  });

  const testBed = setupTestBed() as MappingsEditorTestBed;

  return {
    ...testBed,
    actions: createActions(testBed),
  };
};

export const getMappingsEditorDataFactory = (onChangeHandler: jest.MockedFunction<any>) => {
  /**
   * Helper to access the latest data sent to the onChange handler back to the consumer of the <MappingsEditor />.
   * Read the latest call with its argument passed and build the mappings object from it.
   */
  return async (component: ReactWrapper) => {
    const mockCalls = onChangeHandler.mock.calls;

    if (mockCalls.length === 0) {
      throw new Error(
        `Can't access data forwarded as the onChange() prop handler hasn't been called.`
      );
    }

    const [arg] = mockCalls[mockCalls.length - 1];
    const { isValid, validate, getData } = arg;

    let isMappingsValid = isValid;

    if (isMappingsValid === undefined) {
      isMappingsValid = await act(validate);
      component.update();
    }

    const data = getData(isMappingsValid);

    return {
      isValid: isMappingsValid,
      data,
    };
  };
};

export type MappingsEditorTestBed = TestBed<TestSubjects> & {
  actions: ReturnType<typeof createActions>;
};

export type TestSubjects =
  | 'formTab'
  | 'mappingsEditor'
  | 'fieldsList'
  | 'fieldsListItem'
  | 'fieldsListItem.fieldName'
  | 'fieldName'
  | 'mappingTypesDetectedCallout'
  | 'documentFields'
  | 'dynamicTemplates'
  | 'advancedConfiguration'
  | 'advancedConfiguration.numericDetection'
  | 'advancedConfiguration.numericDetection.input'
  | 'advancedConfiguration.dynamicMappingsToggle'
  | 'advancedConfiguration.dynamicMappingsToggle.input'
  | 'advancedConfiguration.metaField'
  | 'advancedConfiguration.routingRequiredToggle.input'
  | 'sourceField.includesField'
  | 'sourceField.excludesField'
  | 'dynamicTemplatesEditor'
  | 'nameParameterInput'
  | 'addFieldButton'
  | 'editFieldButton'
  | 'toggleExpandButton'
  | 'createFieldForm'
  | 'createFieldForm.fieldType'
  | 'createFieldForm.addButton'
  | 'mappingsEditorFieldEdit'
  | 'mappingsEditorFieldEdit.fieldType'
  | 'mappingsEditorFieldEdit.editFieldUpdateButton'
  | 'mappingsEditorFieldEdit.flyoutTitle'
  | 'mappingsEditorFieldEdit.documentationLink'
  | 'mappingsEditorFieldEdit.fieldPath'
  | 'mappingsEditorFieldEdit.advancedSettings'
  | 'mappingsEditorFieldEdit.toggleAdvancedSetting'
  | 'indexParameter.formRowToggle'
  | 'indexAnalyzer.select'
  | 'searchAnalyzer'
  | 'searchAnalyzer.select'
  | 'searchQuoteAnalyzer'
  | 'searchQuoteAnalyzer.select'
  | 'indexAnalyzer-custom'
  | 'indexAnalyzer-custom.input'
  | 'searchAnalyzer-toggleCustomButton'
  | 'searchAnalyzer-custom'
  | 'searchAnalyzer-custom.input'
  | 'searchQuoteAnalyzer-custom'
  | 'searchQuoteAnalyzer-toggleCustomButton'
  | 'searchQuoteAnalyzer-custom.input'
  | 'useSameAnalyzerForSearchCheckBox.input';
