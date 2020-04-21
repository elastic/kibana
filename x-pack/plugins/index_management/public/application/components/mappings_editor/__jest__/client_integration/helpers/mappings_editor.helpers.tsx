/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { registerTestBed, TestBed, nextTick } from '../../../../../../../../../test_utils';
import { MappingsEditor } from '../../../mappings_editor';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  // Mocking EuiComboBox, as it utilizes "react-virtualized" for rendering search suggestions,
  // which does not produce a valid component wrapper
  EuiComboBox: (props: any) => (
    <input
      data-test-subj={props['data-test-subj'] || 'mockComboBox'}
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
}));

const createActions = (testBed: TestBed<TestSubjects>) => {
  const { find, waitFor, form, component } = testBed;

  const addField = async (name: string, type: string) => {
    const currentCount = find('fieldsListItem').length;

    form.setInputValue('nameParameterInput', name);
    find('createFieldForm.fieldType').simulate('change', [
      {
        label: type,
        value: type,
      },
    ]);

    await nextTick();
    component.update();

    find('createFieldForm.addButton').simulate('click');

    // We wait until there is one more field in the DOM
    await waitFor('fieldsListItem', currentCount + 1);
  };

  const selectTab = async (tab: 'fields' | 'templates' | 'advanced') => {
    const index = ['fields', 'templates', 'advanced'].indexOf(tab);
    const tabIdToContentMap: { [key: string]: TestSubjects } = {
      fields: 'documentFields',
      templates: 'dynamicTemplates',
      advanced: 'advancedConfiguration',
    };

    const tabElement = find('formTab').at(index);
    if (tabElement.length === 0) {
      throw new Error(`Tab not found: "${tab}"`);
    }
    tabElement.simulate('click');

    await waitFor(tabIdToContentMap[tab]);
  };

  const updateJsonEditor = async (testSubject: TestSubjects, value: object) => {
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

  return {
    selectTab,
    addField,
    updateJsonEditor,
    getJsonEditorValue,
  };
};

export const setup = async (props: any = { onUpdate() {} }): Promise<MappingsEditorTestBed> => {
  const testBed = await registerTestBed<TestSubjects>(MappingsEditor, {
    memoryRouter: {
      wrapComponent: false,
    },
    defaultProps: props,
  })();

  return {
    ...testBed,
    actions: createActions(testBed),
  };
};

export type MappingsEditorTestBed = TestBed<TestSubjects> & {
  actions: ReturnType<typeof createActions>;
};

export type TestSubjects =
  | 'formTab'
  | 'mappingsEditor'
  | 'fieldsListItem'
  | 'fieldName'
  | 'mappingTypesDetectedCallout'
  | 'documentFields'
  | 'dynamicTemplates'
  | 'advancedConfiguration'
  | 'advancedConfiguration.numericDetection'
  | 'advancedConfiguration.numericDetection.input'
  | 'advancedConfiguration.dynamicMappingsToggle'
  | 'advancedConfiguration.dynamicMappingsToggle.input'
  | 'dynamicTemplatesEditor'
  | 'nameParameterInput'
  | 'createFieldForm.fieldType'
  | 'createFieldForm.addButton';
