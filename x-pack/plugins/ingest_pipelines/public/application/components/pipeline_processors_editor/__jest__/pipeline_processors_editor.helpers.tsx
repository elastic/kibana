/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { act } from 'react-dom/test-utils';
import React from 'react';
import { registerTestBed, TestBed } from '../../../../../../../test_utils';
import { PipelineProcessorsEditor, Props } from '../pipeline_processors_editor.container';

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

jest.mock('react-virtualized', () => ({
  ...jest.requireActual('react-virtualized'),
  AutoSizer: ({ children }: { children: any }) => (
    <div>{children({ height: 500, width: 500 })}</div>
  ),
}));

const testBedSetup = registerTestBed<TestSubject>(PipelineProcessorsEditor, {
  doMountAsync: false,
});

interface Actions {
  addProcessor: (selector: string, type: string, options: Record<any, any>) => Promise<void>;
  removeProcessor: (processorSelector: string) => void;
  moveProcessor: (processorSelector: string, dropZoneSelector: string) => void;
  addOnFailureProcessor: (
    processorSelector: string,
    type: string,
    options: Record<any, any>
  ) => Promise<void>;
  duplicateProcessor: (processorSelector: string) => void;
  startAndCancelMove: (processorSelector: string) => void;
  toggleOnFailure: () => void;
}

export interface SetupResult extends TestBed<TestSubject> {
  actions: Actions;
}

export const setup = async (props: Props): Promise<SetupResult> => {
  const testBed = await testBedSetup(props);
  const { find, exists, component } = testBed;

  const addProcessor: Actions['addProcessor'] = async (selector, type, options) => {
    find(selector).simulate('click');
    expect(exists('processorSettingsFormFlyout', 1));
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
  };

  const removeProcessor: Actions['removeProcessor'] = (processorSelector) => {
    find('moreMenu-' + processorSelector + '.button').simulate('click');
    find('moreMenu-' + processorSelector + '.deleteButton').simulate('click');
    act(() => {
      find('removeProcessorConfirmationModal.confirmModalConfirmButton').simulate('click');
    });
  };

  const moveProcessor: Actions['moveProcessor'] = (processorSelector, dropZoneSelector) => {
    act(() => {
      find('moveItemButton-' + processorSelector).simulate('click');
    });
    act(() => {
      find(dropZoneSelector).last().simulate('click');
    });
    component.update();
  };

  const addOnFailureProcessor: Actions['addOnFailureProcessor'] = async (
    processorSelector,
    type,
    options
  ) => {
    find('moreMenu-' + processorSelector + '.button').simulate('click');
    find('moreMenu-' + processorSelector + '.addOnFailureButton').simulate('click');
    expect(exists('processorSettingsFormFlyout', 1));
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
    // Assert that the add on failure button has been removed
    find('moreMenu-' + processorSelector + '.button').simulate('click');
    expect(!exists('moreMenu-' + processorSelector + '.addOnFailureButton'));
    // Assert that the add processor button is now visible
    expect(exists('addProcessor-' + processorSelector));
  };

  const duplicateProcessor: Actions['duplicateProcessor'] = (selector) => {
    find('moreMenu-' + selector).simulate('click');
    act(() => {
      find('moreMenu-' + selector + '.duplicateButton').simulate('click');
    });
  };

  const startAndCancelMove: Actions['startAndCancelMove'] = (processorSelector) => {
    act(() => {
      find('moveItemButton-' + processorSelector).simulate('click');
    });
    component.update();
    act(() => {
      find('cancelMoveItemButton-' + processorSelector).simulate('click');
    });
    // Assert that we have exited move mode for this processor
    expect(exists('moveItemButton-' + processorSelector));
  };

  const toggleOnFailure = () => {
    find('pipelineEditorOnFailureToggle').simulate('click');
  };

  return {
    ...testBed,
    actions: {
      toggleOnFailure,
      addProcessor,
      removeProcessor,
      moveProcessor,
      addOnFailureProcessor,
      duplicateProcessor,
      startAndCancelMove,
    },
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
