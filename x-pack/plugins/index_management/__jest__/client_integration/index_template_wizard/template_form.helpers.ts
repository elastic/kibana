/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { TestBed, SetupFunc } from '@kbn/test-jest-helpers';
import { TemplateDeserialized } from '../../../common';

export interface MappingField {
  name: string;
  type: string;
}

// Look at the return type of formSetup and form a union between that type and the TestBed type.
// This way we an define the formSetup return object and use that to dynamically define our type.
export type TemplateFormTestBed = TestBed<TemplateFormTestSubjects> &
  Awaited<ReturnType<typeof formSetup>>;

export const formSetup = async (initTestBed: SetupFunc<TestSubjects>) => {
  const testBed = await initTestBed();

  // User actions
  const clickNextButton = () => {
    testBed.find('nextButton').simulate('click');
    jest.advanceTimersByTime(0); // advance timers to allow the form to validate
  };

  const clickBackButton = () => {
    testBed.find('backButton').simulate('click');
  };

  const clickEditButtonAtField = (index: number) => {
    testBed.find('editFieldButton').at(index).simulate('click');
  };

  const clickEditFieldUpdateButton = () => {
    testBed.find('editFieldUpdateButton').simulate('click');
    jest.advanceTimersByTime(0); // advance timers to allow the form to validate
  };

  const deleteMappingsFieldAt = (index: number) => {
    testBed.find('removeFieldButton').at(index).simulate('click');

    testBed.find('confirmModalConfirmButton').simulate('click');
  };

  const clickCancelCreateFieldButton = () => {
    testBed.find('createFieldForm.cancelButton').simulate('click');
  };

  // Step component templates actions
  const componentTemplates = {
    getComponentTemplatesInList() {
      const { find } = testBed;
      return find('componentTemplatesList.item.name').map((wrapper) => wrapper.text());
    },
    getComponentTemplatesSelected() {
      const { find } = testBed;
      return find('componentTemplatesSelection.item.name').map((wrapper) => wrapper.text());
    },
    showFilters() {
      const { find, component } = testBed;
      act(() => {
        find('componentTemplates.filterButton').simulate('click');
      });
      component.update();
    },
    async selectFilter(filter: 'settings' | 'mappings' | 'aliases') {
      const { find, component } = testBed;
      const filters = ['settings', 'mappings', 'aliases'];
      const index = filters.indexOf(filter);

      await act(async () => {
        find('filterList.filterItem').at(index).simulate('click');
      });
      component.update();
    },
    async selectComponentAt(index: number) {
      const { find, component } = testBed;

      await act(async () => {
        find('componentTemplatesList.item.action-plusInCircle').at(index).simulate('click');
      });
      component.update();
    },
    async unSelectComponentAt(index: number) {
      const { find, component } = testBed;

      await act(async () => {
        find('componentTemplatesSelection.item.action-minusInCircle').at(index).simulate('click');
      });
      component.update();
    },
  };

  // Step Mappings actions
  const mappings = {
    async addField(name: string, type: string) {
      const { find, form, component } = testBed;

      await act(async () => {
        form.setInputValue('nameParameterInput', name);
        jest.advanceTimersByTime(0);
        find('createFieldForm.mockComboBox').simulate('change', [
          {
            label: type,
            value: type,
          },
        ]);
      });

      await act(async () => {
        find('createFieldForm.addButton').simulate('click');
        jest.advanceTimersByTime(0);
      });

      component.update();
    },
  };

  // Step Review actions
  const review = {
    async selectTab(tab: 'summary' | 'preview' | 'request') {
      const tabs = ['summary', 'preview', 'request'];

      await act(async () => {
        testBed
          .find('summaryTabContent')
          .find('button.euiTab')
          .at(tabs.indexOf(tab))
          .simulate('click');
      });

      testBed.component.update();
    },
  };

  const completeStepOne = async ({
    name,
    indexPatterns,
    order,
    priority,
    version,
    dataStream,
  }: Partial<TemplateDeserialized> = {}) => {
    const { component, form, find } = testBed;

    if (name) {
      act(() => {
        form.setInputValue('nameField.input', name);
      });
    }

    if (indexPatterns) {
      const indexPatternsFormatted = indexPatterns.map((pattern: string) => ({
        label: pattern,
        value: pattern,
      }));

      act(() => {
        find('mockComboBox').simulate('change', indexPatternsFormatted); // Using mocked EuiComboBox
        jest.advanceTimersByTime(0);
      });
    }

    await act(async () => {
      if (order) {
        form.setInputValue('orderField.input', JSON.stringify(order));
      }

      if (dataStream) {
        form.toggleEuiSwitch('dataStreamField.input');
      }

      if (priority) {
        form.setInputValue('priorityField.input', JSON.stringify(priority));
      }

      if (version) {
        form.setInputValue('versionField.input', JSON.stringify(version));
      }

      clickNextButton();
    });

    component.update();
  };

  const completeStepTwo = async (componentName?: string) => {
    const { find, component } = testBed;

    if (componentName) {
      // Find the index of the template in the list
      const allComponents = find('componentTemplatesList.item.name').map((wrapper) =>
        wrapper.text()
      );
      const index = allComponents.indexOf(componentName);
      if (index < 0) {
        throw new Error(
          `Could not find component "${componentName}" in the list ${JSON.stringify(allComponents)}`
        );
      }

      await componentTemplates.selectComponentAt(index);
    }

    await act(async () => {
      clickNextButton();
      jest.advanceTimersByTime(0);
    });

    component.update();
  };

  const completeStepThree = async (settings?: string) => {
    const { find, component } = testBed;

    await act(async () => {
      if (settings) {
        find('settingsEditor').simulate('change', {
          jsonString: settings,
        }); // Using mocked EuiCodeEditor
        jest.advanceTimersByTime(0);
      }
    });

    await act(async () => {
      clickNextButton();
      jest.advanceTimersByTime(0);
    });

    component.update();
  };

  const completeStepFour = async (mappingFields?: MappingField[]) => {
    const { component } = testBed;

    if (mappingFields) {
      for (const field of mappingFields) {
        const { name, type } = field;
        await mappings.addField(name, type);
      }
    }

    await act(async () => {
      clickNextButton();
      jest.advanceTimersByTime(0);
    });

    component.update();
  };

  const completeStepFive = async (aliases?: string) => {
    const { find, component } = testBed;

    if (aliases) {
      await act(async () => {
        find('aliasesEditor').simulate('change', {
          jsonString: aliases,
        }); // Using mocked EuiCodeEditor
        jest.advanceTimersByTime(0); // advance timers to allow the form to validate
      });
      component.update();
    }

    await act(async () => {
      clickNextButton();
    });

    component.update();
  };

  const previewTemplate = async () => {
    testBed.find('previewIndexTemplate').simulate('click');
  };

  return {
    ...testBed,
    actions: {
      clickNextButton,
      clickBackButton,
      clickEditButtonAtField,
      clickEditFieldUpdateButton,
      deleteMappingsFieldAt,
      clickCancelCreateFieldButton,
      completeStepOne,
      completeStepTwo,
      completeStepThree,
      completeStepFour,
      completeStepFive,
      componentTemplates,
      mappings,
      review,
      previewTemplate,
    },
  };
};

export type TemplateFormTestSubjects = TestSubjects;

export type TestSubjects =
  | 'backButton'
  | 'codeEditorContainer'
  | 'confirmModalConfirmButton'
  | 'componentTemplates.filterButton'
  | 'componentTemplates.emptySearchResult'
  | 'filterList.filterItem'
  | 'componentTemplatesList'
  | 'componentTemplatesList.item.name'
  | 'componentTemplatesList.item.action-plusInCircle'
  | 'componentTemplatesSelection'
  | 'componentTemplatesSelection.item.name'
  | 'componentTemplatesSelection.item.action-minusInCircle'
  | 'componentTemplatesSelection.emptyPrompt'
  | 'componentTemplateSearchBox'
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
  | 'legacyIndexTemplateDeprecationWarning'
  | 'mappingsEditorFieldEdit'
  | 'mockCodeEditor'
  | 'mockComboBox'
  | 'nameField'
  | 'nameField.input'
  | 'nameParameterInput'
  | 'nextButton'
  | 'orderField'
  | 'orderField.input'
  | 'priorityField.input'
  | 'dataStreamField.input'
  | 'pageTitle'
  | 'previewTab'
  | 'removeFieldButton'
  | 'requestTab'
  | 'saveTemplateError'
  | 'settingsEditor'
  | 'systemTemplateEditCallout'
  | 'stepComponents'
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
  | 'aliasesEditor'
  | 'settingsEditor'
  | 'versionField.input'
  | 'mappingsEditor.formTab'
  | 'mappingsEditor.advancedConfiguration.sizeEnabledToggle'
  | 'previewIndexTemplate';
