/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { act } from 'react-dom/test-utils';
import React from 'react';
import { registerTestBed, TestBed } from '../../../../../../../test_utils';
import {
  PipelineProcessorsContextProvider,
  Props,
  ProcessorsEditor,
  GlobalOnFailureProcessorsEditor,
} from '../';

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
  };
});

jest.mock('../../../../../../../../src/plugins/kibana_react/public', () => {
  const original = jest.requireActual('../../../../../../../../src/plugins/kibana_react/public');
  return {
    ...original,
    // Mocking CodeEditor, which uses React Monaco under the hood
    CodeEditor: (props: any) => (
      <input
        data-test-subj={props['data-test-subj'] || 'mockCodeEditor'}
        data-currentvalue={props.value}
        onChange={(e: any) => {
          props.onChange(e.jsonContent);
        }}
      />
    ),
  };
});

jest.mock('react-virtualized', () => {
  const original = jest.requireActual('react-virtualized');

  return {
    ...original,
    AutoSizer: ({ children }: { children: any }) => (
      <div>{children({ height: 500, width: 500 })}</div>
    ),
  };
});

const testBedSetup = registerTestBed<TestSubject>(
  (props: Props) => (
    <PipelineProcessorsContextProvider {...props}>
      <ProcessorsEditor /> <GlobalOnFailureProcessorsEditor />
    </PipelineProcessorsContextProvider>
  ),
  {
    doMountAsync: false,
  }
);

export interface SetupResult extends TestBed<TestSubject> {
  actions: ReturnType<typeof createActions>;
}

/**
 * We make heavy use of "processorSelector" in these actions. They are a way to uniquely identify
 * a processor and are a stringified version of {@link ProcessorSelector}.
 *
 * @remark
 * See also {@link selectorToDataTestSubject}.
 */
const createActions = (testBed: TestBed<TestSubject>) => {
  const { find, component } = testBed;

  return {
    async addProcessor(processorsSelector: string, type: string, options: Record<string, any>) {
      find(`${processorsSelector}.addProcessorButton`).simulate('click');
      await act(async () => {
        find('processorTypeSelector').simulate('change', [{ value: type, label: type }]);
      });
      component.update();
      await act(async () => {
        find('processorOptionsEditor').simulate('change', {
          jsonContent: JSON.stringify(options),
        });
      });
      await act(async () => {
        find('processorSettingsForm.submitButton').simulate('click');
      });
    },

    removeProcessor(processorSelector: string) {
      find(`${processorSelector}.moreMenu.button`).simulate('click');
      find(`${processorSelector}.moreMenu.deleteButton`).simulate('click');
      act(() => {
        find('removeProcessorConfirmationModal.confirmModalConfirmButton').simulate('click');
      });
    },

    moveProcessor(processorSelector: string, dropZoneSelector: string) {
      act(() => {
        find(`${processorSelector}.moveItemButton`).simulate('change');
      });
      component.update();
      act(() => {
        find(dropZoneSelector).simulate('click');
      });
      component.update();
    },

    async addOnFailureProcessor(
      processorSelector: string,
      type: string,
      options: Record<string, any>
    ) {
      find(`${processorSelector}.moreMenu.button`).simulate('click');
      find(`${processorSelector}.moreMenu.addOnFailureButton`).simulate('click');
      await act(async () => {
        find('processorTypeSelector').simulate('change', [{ value: type, label: type }]);
      });
      component.update();
      await act(async () => {
        find('processorOptionsEditor').simulate('change', {
          jsonContent: JSON.stringify(options),
        });
      });
      await act(async () => {
        find('processorSettingsForm.submitButton').simulate('click');
      });
    },

    startAndCancelMove(processorSelector: string) {
      act(() => {
        find(`${processorSelector}.moveItemButton`).simulate('change');
      });
      component.update();
      act(() => {
        find(`${processorSelector}.cancelMoveItemButton`).simulate('change');
      });
      component.update();
    },

    duplicateProcessor(processorSelector: string) {
      find(`${processorSelector}.moreMenu.button`).simulate('click');
      act(() => {
        find(`${processorSelector}.moreMenu.duplicateButton`).simulate('click');
      });
    },
  };
};

export const setup = async (props: Props): Promise<SetupResult> => {
  const testBed = await testBedSetup(props);
  return {
    ...testBed,
    actions: createActions(testBed),
  };
};

type TestSubject =
  | 'pipelineEditorDoneButton'
  | 'pipelineEditorOnFailureToggle'
  | 'addProcessorsButtonLevel1'
  | 'processorSettingsForm'
  | 'processorSettingsForm.submitButton'
  | 'processorOptionsEditor'
  | 'processorSettingsFormFlyout'
  | 'processorTypeSelector'
  | 'pipelineEditorOnFailureTree'
  | string;
