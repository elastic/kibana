/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TestBed, SetupFunc, UnwrapPromise } from '../../../../../test_utils';
import { TemplateDeserialized } from '../../../common';
import { nextTick } from '../helpers';

interface MappingField {
  name: string;
  type: string;
}

// Look at the return type of formSetup and form a union between that type and the TestBed type.
// This way we an define the formSetup return object and use that to dynamically define our type.
export type TemplateFormTestBed = TestBed<TemplateFormTestSubjects> &
  UnwrapPromise<ReturnType<typeof formSetup>>;

export const formSetup = async (initTestBed: SetupFunc<TestSubjects>) => {
  const testBed = await initTestBed();

  // User actions
  const clickNextButton = () => {
    testBed.find('nextButton').simulate('click');
  };

  const clickBackButton = () => {
    testBed.find('backButton').simulate('click');
  };

  const clickSubmitButton = () => {
    testBed.find('submitButton').simulate('click');
  };

  const clickEditButtonAtField = (index: number) => {
    testBed.find('editFieldButton').at(index).simulate('click');
  };

  const clickEditFieldUpdateButton = () => {
    testBed.find('editFieldUpdateButton').simulate('click');
  };

  const deleteMappingsFieldAt = (index: number) => {
    testBed.find('removeFieldButton').at(index).simulate('click');

    testBed.find('confirmModalConfirmButton').simulate('click');
  };

  const clickCancelCreateFieldButton = () => {
    testBed.find('createFieldForm.cancelButton').simulate('click');
  };

  const completeStepOne = async ({
    name,
    indexPatterns,
    order,
    version,
  }: Partial<TemplateDeserialized> = {}) => {
    const { form, find, waitFor } = testBed;

    if (name) {
      form.setInputValue('nameField.input', name);
    }

    if (indexPatterns) {
      const indexPatternsFormatted = indexPatterns.map((pattern: string) => ({
        label: pattern,
        value: pattern,
      }));

      find('mockComboBox').simulate('change', indexPatternsFormatted); // Using mocked EuiComboBox
      await nextTick();
    }

    if (order) {
      form.setInputValue('orderField.input', JSON.stringify(order));
    }

    if (version) {
      form.setInputValue('versionField.input', JSON.stringify(version));
    }

    clickNextButton();
    await waitFor('stepSettings');
  };

  const completeStepTwo = async (settings?: string) => {
    const { find, component, waitFor } = testBed;

    if (settings) {
      find('mockCodeEditor').simulate('change', {
        jsonString: settings,
      }); // Using mocked EuiCodeEditor
      await nextTick();
      component.update();
    }

    clickNextButton();
    await waitFor('stepMappings');
  };

  const completeStepThree = async (mappingFields?: MappingField[]) => {
    const { waitFor } = testBed;

    if (mappingFields) {
      for (const field of mappingFields) {
        const { name, type } = field;
        await addMappingField(name, type);
      }
    }

    clickNextButton();
    await waitFor('stepAliases');
  };

  const completeStepFour = async (aliases?: string, waitForNextStep = true) => {
    const { find, component, waitFor } = testBed;

    if (aliases) {
      find('mockCodeEditor').simulate('change', {
        jsonString: aliases,
      }); // Using mocked EuiCodeEditor
      await nextTick();
      component.update();
    }

    clickNextButton();

    if (waitForNextStep) {
      await waitFor('summaryTab');
    } else {
      component.update();
    }
  };

  const selectSummaryTab = (tab: 'summary' | 'request') => {
    const tabs = ['summary', 'request'];

    testBed.find('summaryTabContent').find('.euiTab').at(tabs.indexOf(tab)).simulate('click');
  };

  const addMappingField = async (name: string, type: string) => {
    const { find, form, component } = testBed;

    form.setInputValue('nameParameterInput', name);
    find('createFieldForm.mockComboBox').simulate('change', [
      {
        label: type,
        value: type,
      },
    ]);

    await nextTick(50);
    component.update();

    find('createFieldForm.addButton').simulate('click');

    await nextTick();
    component.update();
  };

  return {
    ...testBed,
    actions: {
      clickNextButton,
      clickBackButton,
      clickSubmitButton,
      clickEditButtonAtField,
      clickEditFieldUpdateButton,
      deleteMappingsFieldAt,
      clickCancelCreateFieldButton,
      completeStepOne,
      completeStepTwo,
      completeStepThree,
      completeStepFour,
      selectSummaryTab,
      addMappingField,
    },
  };
};

export type TemplateFormTestSubjects = TestSubjects;

export type TestSubjects =
  | 'backButton'
  | 'codeEditorContainer'
  | 'confirmModalConfirmButton'
  | 'createFieldForm.addPropertyButton'
  | 'createFieldForm.addButton'
  | 'createFieldForm.addFieldButton'
  | 'createFieldForm.addMultiFieldButton'
  | 'createFieldForm.cancelButton'
  | 'createFieldForm.mockComboBox'
  | 'editFieldButton'
  | 'editFieldUpdateButton'
  | 'fieldsListItem'
  | 'fieldType'
  | 'indexPatternsField'
  | 'indexPatternsWarning'
  | 'indexPatternsWarningDescription'
  | 'mappingsEditorFieldEdit'
  | 'mockCodeEditor'
  | 'mockComboBox'
  | 'nameField'
  | 'nameField.input'
  | 'nameParameterInput'
  | 'nextButton'
  | 'orderField'
  | 'orderField.input'
  | 'pageTitle'
  | 'removeFieldButton'
  | 'requestTab'
  | 'saveTemplateError'
  | 'settingsEditor'
  | 'systemTemplateEditCallout'
  | 'stepAliases'
  | 'stepMappings'
  | 'stepSettings'
  | 'stepSummary'
  | 'stepTitle'
  | 'submitButton'
  | 'summaryTab'
  | 'summaryTabContent'
  | 'templateForm'
  | 'templateFormContainer'
  | 'testingEditor'
  | 'versionField'
  | 'versionField.input';
