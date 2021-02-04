/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import React from 'react';
import axios from 'axios';
import axiosXhrAdapter from 'axios/lib/adapters/xhr';

/* eslint-disable @kbn/eslint/no-restricted-paths */
import { usageCollectionPluginMock } from 'src/plugins/usage_collection/public/mocks';

import { registerTestBed, TestBed } from '@kbn/test/jest';
import { stubWebWorker } from '@kbn/test/jest';
import { uiMetricService, apiService } from '../../../services';
import { Props } from '../';
import { initHttpRequests } from './http_requests.helpers';
import { ProcessorsEditorWithDeps } from './processors_editor';

stubWebWorker();

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

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    // Mocking EuiCodeEditor, which uses React Ace under the hood
    EuiCodeEditor: (props: any) => (
      <input
        data-test-subj={props['data-test-subj']}
        onChange={(syntheticEvent: any) => {
          props.onChange(syntheticEvent.jsonString);
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
  (props: Props) => <ProcessorsEditorWithDeps {...props} />,
  {
    doMountAsync: false,
  }
);

export interface SetupResult extends TestBed<TestSubject> {
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

    async clickProcessorOutputTab() {
      await act(async () => {
        find('outputTab').simulate('click');
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
      });
      component.update();
    },

    async toggleVerboseSwitch() {
      await act(async () => {
        form.toggleEuiSwitch('verboseOutputToggle');
      });
      component.update();
    },

    addDocumentsJson(jsonString: string) {
      find('documentsEditor').simulate('change', {
        jsonString,
      });
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
      });
      component.update();
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

const mockHttpClient = axios.create({ adapter: axiosXhrAdapter });

export const setupEnvironment = () => {
  // Initialize mock services
  uiMetricService.setup(usageCollectionPluginMock.createSetupContract());
  // @ts-ignore
  apiService.setup(mockHttpClient, uiMetricService);

  const { server, httpRequestsMockHelpers } = initHttpRequests();

  return {
    server,
    httpRequestsMockHelpers,
  };
};

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
