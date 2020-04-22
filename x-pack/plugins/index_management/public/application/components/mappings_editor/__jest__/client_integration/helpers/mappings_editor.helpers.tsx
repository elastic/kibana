/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { act } from 'react-dom/test-utils';

import { registerTestBed, TestBed, nextTick } from '../../../../../../../../../test_utils';
import { MappingsEditor } from '../../../mappings_editor';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
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
}));

const createActions = (testBed: TestBed<TestSubjects>) => {
  const { find, exists, waitFor, waitForFn, form, component } = testBed;

  const expandAllChildrenAt = async (path: string) => {
    const pathToArray = path.split('.');

    const proceed = async (index = 0): Promise<void> => {
      const pathToField = pathToArray.slice(0, index + 1);
      const testSubjectField = `${pathToField.join('')}Field`;

      const expandButton = find(`${testSubjectField}.toggleExpandButton` as TestSubjects);

      if (expandButton.length === 0) {
        return;
      }
      const isExpanded = (expandButton.props()['aria-label'] as string).includes('Collapse');

      if (!isExpanded) {
        expandButton.simulate('click');
      }

      // Wait for the children FieldList to be there
      await waitFor(`${testSubjectField}.fieldsList` as TestSubjects);

      if (index < pathToArray.length - 1) {
        return proceed(++index);
      }
    };

    return proceed();
  };

  // Get a nested field in the rendered DOM tree
  const getFieldAt = async (path: string) => {
    // First make sure all the parents fields are expanded and all present in the DOM
    await expandAllChildrenAt(path);

    const testSubjectField = `${path.split('.').join('')}Field`;
    return find(testSubjectField as TestSubjects);
  };

  const addField = async (name: string, type: string) => {
    const currentCount = find('fieldsListItem').length;

    if (!exists('createFieldForm')) {
      find('addFieldButton').simulate('click');
      await waitFor('createFieldForm');
    }

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

  const startEditField = async (path: string) => {
    const field = await getFieldAt(path);
    find('editFieldButton', field).simulate('click');
    // Wait until the details flyout is open
    await waitFor('mappingsEditorFieldEdit');
  };

  const showAdvancedSettings = async () => {
    const checkIsVisible = async () =>
      find('mappingsEditorFieldEdit.advancedSettings').props().style.display === 'block';

    if (await checkIsVisible()) {
      // Already opened, nothing else to do
      return;
    }

    find('mappingsEditorFieldEdit.toggleAdvancedSetting').simulate('click');

    await waitForFn(
      checkIsVisible,
      'Error waiting for the advanced settings CSS style.display to be "block"'
    );
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

  const getComboBoxValue = (testSubject: TestSubjects) => {
    const value = find(testSubject).props()['data-currentvalue'];
    if (value === undefined) {
      return [];
    }
    return value.map(({ label }: any) => label);
  };

  const getToggleValue = (testSubject: TestSubjects): boolean =>
    find(testSubject).props()['aria-checked'];

  return {
    selectTab,
    getFieldAt,
    addField,
    startEditField,
    showAdvancedSettings,
    updateJsonEditor,
    getJsonEditorValue,
    getComboBoxValue,
    getToggleValue,
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

export const expectDataUpdatedFactory = (onUpdateHandler: jest.MockedFunction<any>) => {
  /**
   * Helper to access the latest data sent to the onUpdate handler back to the consumer of the <MappingsEditor />.
   * Read the latest call with its argument passed and build the mappings object from it.
   */
  const getDataForwarded = async () => {
    const mockCalls = onUpdateHandler.mock.calls;

    if (mockCalls.length === 0) {
      throw new Error(
        `Can't access data forwarded as the onUpdate() prop handler hasn't been called.`
      );
    }

    const [arg] = mockCalls[mockCalls.length - 1];
    const { isValid, validate, getData } = arg;

    let isMappingsValid: boolean = false;
    let data: any;

    await act(async () => {
      isMappingsValid = isValid === undefined ? await validate() : isValid;
      data = getData(isMappingsValid);
    });

    return {
      isValid: isMappingsValid,
      data,
    };
  };

  const expectDataUpdated = async (expected: any) => {
    const { data } = await getDataForwarded();
    expect(data).toEqual(expected);
  };

  return expectDataUpdated;
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
  | 'mappingsEditorFieldEdit.flyoutTitle'
  | 'mappingsEditorFieldEdit.documentationLink'
  | 'mappingsEditorFieldEdit.fieldPath'
  | 'mappingsEditorFieldEdit.advancedSettings'
  | 'mappingsEditorFieldEdit.toggleAdvancedSetting'
  | 'indexParameter.formRowToggle';
