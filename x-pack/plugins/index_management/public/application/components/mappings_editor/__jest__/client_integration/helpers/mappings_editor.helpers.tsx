/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { ReactWrapper } from 'enzyme';
import { registerTestBed, TestBed, findTestSubject } from '@kbn/test-jest-helpers';

// This import needs to come first as it sets the jest.mock calls
import { WithAppDependencies } from './setup_environment';
import { getChildFieldsName } from '../../../lib';
import { RuntimeField } from '../../../shared_imports';
import { MappingsEditor } from '../../../mappings_editor';

export interface DomFields {
  [key: string]: {
    type: string;
    properties?: DomFields;
    fields?: DomFields;
  };
}

const createActions = (testBed: TestBed<TestSubjects>) => {
  const { find, exists, form, component } = testBed;

  // --- Mapped fields ---
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

  const addField = async (name: string, type: string, subType?: string) => {
    await act(async () => {
      form.setInputValue('nameParameterInput', name);
      find('createFieldForm.fieldType').simulate('change', [
        {
          label: type,
          value: type,
        },
      ]);
    });

    component.update();

    if (subType !== undefined && type === 'other') {
      await act(async () => {
        // subType is a text input
        form.setInputValue('createFieldForm.fieldSubType', subType);
      });
    }

    await act(async () => {
      find('createFieldForm.addButton').simulate('click');
    });

    component.update();
  };

  const startEditField = async (path: string) => {
    const { testSubject } = getFieldAt(path);
    await act(async () => {
      find(`${testSubject}.editFieldButton` as TestSubjects).simulate('click');
    });
    component.update();
  };

  const updateFieldAndCloseFlyout = async () => {
    await act(async () => {
      find('mappingsEditorFieldEdit.editFieldUpdateButton').simulate('click');
    });
    component.update();
  };

  const showAdvancedSettings = async () => {
    if (find('mappingsEditorFieldEdit.advancedSettings').props().style.display === 'block') {
      // Already opened, nothing else to do
      return;
    }

    await act(async () => {
      find('mappingsEditorFieldEdit.toggleAdvancedSetting').simulate('click');
    });

    component.update();
  };

  // --- Runtime fields ---
  const openRuntimeFieldEditor = () => {
    find('createRuntimeFieldButton').simulate('click');
    component.update();
  };

  const updateRuntimeFieldForm = async (field: RuntimeField) => {
    const valueToLabelMap = {
      keyword: 'Keyword',
      date: 'Date',
      ip: 'IP',
      long: 'Long',
      double: 'Double',
      boolean: 'Boolean',
    };

    if (!exists('runtimeFieldEditor')) {
      throw new Error(`Can't update runtime field form as the editor is not opened.`);
    }

    await act(async () => {
      form.setInputValue('runtimeFieldEditor.nameField.input', field.name);
      form.setInputValue('runtimeFieldEditor.scriptField', field.script.source);
      find('typeField').simulate('change', [
        {
          label: valueToLabelMap[field.type],
          value: field.type,
        },
      ]);
    });
  };

  const getRuntimeFieldsList = () => {
    const fields = find('runtimeFieldsListItem').map((wrapper) => wrapper);
    return fields.map((field) => {
      return {
        reactWrapper: field,
        name: findTestSubject(field, 'fieldName').text(),
        type: findTestSubject(field, 'fieldType').text(),
      };
    });
  };

  /**
   * Open the editor, fill the form and close the editor
   * @param field the field to add
   */
  const addRuntimeField = async (field: RuntimeField) => {
    openRuntimeFieldEditor();

    await updateRuntimeFieldForm(field);

    await act(async () => {
      find('runtimeFieldEditor.saveFieldButton').simulate('click');
    });
    component.update();
  };

  const deleteRuntimeField = async (name: string) => {
    const runtimeField = getRuntimeFieldsList().find((field) => field.name === name);

    if (!runtimeField) {
      throw new Error(`Runtime field "${name}" to delete not found.`);
    }

    await act(async () => {
      findTestSubject(runtimeField.reactWrapper, 'removeFieldButton').simulate('click');
    });
    component.update();

    // Modal is opened, confirm deletion
    const modal = find('runtimeFieldDeleteConfirmModal');

    act(() => {
      findTestSubject(modal, 'confirmModalConfirmButton').simulate('click');
    });

    component.update();
  };

  const startEditRuntimeField = async (name: string) => {
    const runtimeField = getRuntimeFieldsList().find((field) => field.name === name);

    if (!runtimeField) {
      throw new Error(`Runtime field "${name}" to edit not found.`);
    }

    await act(async () => {
      findTestSubject(runtimeField.reactWrapper, 'editFieldButton').simulate('click');
    });
    component.update();
  };

  // --- Other ---
  const selectTab = async (tab: 'fields' | 'runtimeFields' | 'templates' | 'advanced') => {
    const index = ['fields', 'runtimeFields', 'templates', 'advanced'].indexOf(tab);

    const tabElement = find('formTab').at(index);
    if (tabElement.length === 0) {
      throw new Error(`Tab not found: "${tab}"`);
    }

    await act(async () => {
      tabElement.simulate('click');
    });
    component.update();
  };

  const updateJsonEditor = (testSubject: TestSubjects, value: object) => {
    find(testSubject).simulate('change', { jsonString: JSON.stringify(value) });
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

  const toggleFormRow = (formRowName: string) => {
    form.toggleEuiSwitch(`${formRowName}.formRowToggle`);
  };

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
    toggleFormRow,
    openRuntimeFieldEditor,
    getRuntimeFieldsList,
    updateRuntimeFieldForm,
    addRuntimeField,
    deleteRuntimeField,
    startEditRuntimeField,
  };
};

export const setup = (props: any = { onUpdate() {} }): MappingsEditorTestBed => {
  const setupTestBed = registerTestBed<TestSubjects>(WithAppDependencies(MappingsEditor), {
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

    let isMappingsValid: boolean = isValid;

    if (isMappingsValid === undefined) {
      await act(async () => {
        isMappingsValid = await validate();
      });
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
  | 'createFieldForm.fieldSubType'
  | 'createFieldForm.addButton'
  | 'mappingsEditorFieldEdit'
  | 'mappingsEditorFieldEdit.fieldType'
  | 'mappingsEditorFieldEdit.fieldSubType'
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
  | 'useSameAnalyzerForSearchCheckBox.input'
  | 'metaParameterEditor'
  | 'scalingFactor.input'
  | 'formatParameter'
  | 'formatParameter.formatInput'
  | string;
