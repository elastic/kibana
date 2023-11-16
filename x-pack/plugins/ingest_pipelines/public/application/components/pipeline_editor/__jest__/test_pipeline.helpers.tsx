/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import React from 'react';

import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/public/mocks';
import { HttpSetup } from '@kbn/core/public';

import { registerTestBed, TestBed } from '@kbn/test-jest-helpers';
import { stubWebWorker } from '@kbn/test-jest-helpers';

import { uiMetricService, apiService } from '../../../services';
import { Props } from '..';
import { initHttpRequests } from './http_requests.helpers';
import { ProcessorsEditorWithDeps } from './processors_editor';

stubWebWorker();

jest.mock('@kbn/kibana-react-plugin/public', () => {
  const original = jest.requireActual('@kbn/kibana-react-plugin/public');

  return {
    ...original,
    // Mocking CodeEditor, which uses React Monaco under the hood
    CodeEditor: (props: any) => (
      <input
        data-test-subj={props['data-test-subj'] || 'mockCodeEditor'}
        data-currentvalue={props.value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          props.onChange(e.currentTarget.getAttribute('data-currentvalue'));
        }}
      />
    ),
  };
});

jest.mock('react-virtualized/dist/commonjs/AutoSizer', () => ({ children }: { children: any }) => (
  <div>{children({ height: 500, width: 500 })}</div>
));

const testBedSetup = registerTestBed<TestSubject>(
  (props: Props) => <ProcessorsEditorWithDeps {...props} />,
  {
    doMountAsync: false,
  }
);

export interface SetupResult extends TestBed<TestSubject> {
  httpSetup: HttpSetup;
  actions: ReturnType<typeof createActions>;
}

const createActions = (testBed: TestBed<TestSubject>) => {
  const { find, component, form } = testBed;

  return {
    clickAddDocumentsButton() {
      act(() => {
        find('addDocumentsButton').simulate('click');
      });
      component.update();
    },

    async clickViewOutputButton() {
      await act(async () => {
        find('viewOutputButton').simulate('click');
      });
      component.update();
    },

    closeTestPipelineFlyout() {
      act(() => {
        find('euiFlyoutCloseButton').simulate('click');
      });
      component.update();
    },

    async clickProcessorConfigurationTab() {
      await act(async () => {
        find('configurationTab').simulate('click');
      });
      component.update();
    },

    async clickProcessorOutputTab() {
      await act(async () => {
        find('outputTab').simulate('click');
        jest.advanceTimersByTime(0); // advance timers to allow the form to validate
      });
      component.update();
    },

    async clickRefreshOutputButton() {
      await act(async () => {
        find('refreshOutputButton').simulate('click');
      });
      component.update();
    },

    async clickRunPipelineButton() {
      await act(async () => {
        find('runPipelineButton').simulate('click');
        jest.advanceTimersByTime(0); // advance timers to allow the form to validate
      });
      component.update();
    },

    async toggleVerboseSwitch() {
      await act(async () => {
        form.toggleEuiSwitch('verboseOutputToggle');
        jest.advanceTimersByTime(0); // advance timers to allow the form to validate
      });
      component.update();
    },

    addDocumentsJson(jsonString: string) {
      find('documentsEditor').getDOMNode().setAttribute('data-currentvalue', jsonString);
      find('documentsEditor').simulate('change');
    },

    clickDocumentsDropdown() {
      act(() => {
        find('documentsDropdown.documentsButton').simulate('click');
      });
      component.update();
    },

    clickEditDocumentsButton() {
      act(() => {
        find('editDocumentsButton').simulate('click');
      });
      component.update();
    },

    clickClearAllButton() {
      act(() => {
        find('clearAllDocumentsButton').simulate('click');
      });
      component.update();
    },

    async clickConfirmResetButton() {
      const modal = document.body.querySelector(
        '[data-test-subj="resetDocumentsConfirmationModal"]'
      );
      const confirmButton: HTMLButtonElement | null = modal!.querySelector(
        '[data-test-subj="confirmModalConfirmButton"]'
      );

      await act(async () => {
        confirmButton!.click();
      });
      component.update();
    },

    async clickProcessor(processorSelector: string) {
      await act(async () => {
        find(`${processorSelector}.manageItemButton`).simulate('click');
      });
      component.update();
    },

    async toggleDocumentsAccordion() {
      await act(async () => {
        find('addDocumentsAccordion').simulate('click');
      });
      component.update();
    },

    async clickAddDocumentButton() {
      await act(async () => {
        find('addDocumentButton').simulate('click');
        jest.advanceTimersByTime(0); // advance timers to allow the form to validate
      });
      component.update();
    },
  };
};

export const setup = async (httpSetup: HttpSetup, props: Props): Promise<SetupResult> => {
  // Initialize mock services
  uiMetricService.setup(usageCollectionPluginMock.createSetupContract());
  // @ts-ignore
  apiService.setup(httpSetup, uiMetricService);

  const testBed = testBedSetup(props);

  return {
    ...testBed,
    httpSetup,
    actions: createActions(testBed),
  };
};

export const setupEnvironment = initHttpRequests;

type TestSubject =
  | 'addDocumentsButton'
  | 'testPipelineFlyout'
  | 'documentsDropdown'
  | 'documentsDropdown.documentsButton'
  | 'outputTab'
  | 'documentsEditor'
  | 'runPipelineButton'
  | 'documentsTabContent'
  | 'outputTabContent'
  | 'verboseOutputToggle'
  | 'refreshOutputButton'
  | 'viewOutputButton'
  | 'pipelineExecutionError'
  | 'euiFlyoutCloseButton'
  | 'processorStatusIcon'
  | 'documentsTab'
  | 'manageItemButton'
  | 'addProcessorForm'
  | 'editProcessorForm'
  | 'configurationTab'
  | 'outputTab'
  | 'processorOutputTabContent'
  | 'editDocumentsButton'
  | 'clearAllDocumentsButton'
  | 'addDocumentsAccordion'
  | 'addDocumentButton'
  | 'addDocumentError'
  | 'addDocumentSuccess'
  | string;
