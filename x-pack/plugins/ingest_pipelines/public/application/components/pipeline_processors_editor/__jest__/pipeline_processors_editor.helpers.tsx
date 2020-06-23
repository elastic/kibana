/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { act } from 'react-dom/test-utils';
import React from 'react';
import { registerTestBed, TestBed } from '../../../../../../../test_utils';
import { PipelineProcessorsEditor, Props } from '../pipeline_processors_editor.container';

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

const testBedSetup = registerTestBed<TestSubject>(PipelineProcessorsEditor, {
  doMountAsync: false,
});

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
        find(`${processorSelector}.moveItemButton`).simulate('click');
      });
      act(() => {
        find(dropZoneSelector).last().simulate('click');
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

    duplicateProcessor(processorSelector: string) {
      find(`${processorSelector}.moreMenu.button`).simulate('click');
      act(() => {
        find(`${processorSelector}.moreMenu.duplicateButton`).simulate('click');
      });
    },

    startAndCancelMove(processorSelector: string) {
      act(() => {
        find(`${processorSelector}.moveItemButton`).simulate('click');
      });
      component.update();
      act(() => {
        find(`${processorSelector}.cancelMoveItemButton`).simulate('click');
      });
    },

    toggleOnFailure() {
      find('pipelineEditorOnFailureToggle').simulate('click');
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
