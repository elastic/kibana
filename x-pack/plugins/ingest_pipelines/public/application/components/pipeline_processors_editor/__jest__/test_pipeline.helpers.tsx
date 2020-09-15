/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { act } from 'react-dom/test-utils';
import React from 'react';
import axios from 'axios';
import axiosXhrAdapter from 'axios/lib/adapters/xhr';

import { notificationServiceMock, scopedHistoryMock } from 'src/core/public/mocks';

import { LocationDescriptorObject } from 'history';
import { KibanaContextProvider } from 'src/plugins/kibana_react/public';
/* eslint-disable @kbn/eslint/no-restricted-paths */
import { usageCollectionPluginMock } from 'src/plugins/usage_collection/public/mocks';

import { registerTestBed, TestBed } from '../../../../../../../test_utils';
import { stubWebWorker } from '../../../../../../../test_utils/stub_web_worker';

import {
  breadcrumbService,
  uiMetricService,
  documentationService,
  apiService,
} from '../../../services';

import {
  ProcessorsEditorContextProvider,
  Props,
  GlobalOnFailureProcessorsEditor,
  ProcessorsEditor,
} from '../';
import { TestPipelineActions } from '../';

import { initHttpRequests } from './http_requests.helpers';

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

const history = scopedHistoryMock.create();
history.createHref.mockImplementation((location: LocationDescriptorObject) => {
  return `${location.pathname}?${location.search}`;
});

const appServices = {
  breadcrumbs: breadcrumbService,
  metric: uiMetricService,
  documentation: documentationService,
  api: apiService,
  notifications: notificationServiceMock.createSetupContract(),
  history,
  uiSettings: {},
};

const testBedSetup = registerTestBed<TestSubject>(
  (props: Props) => (
    <KibanaContextProvider services={appServices}>
      <ProcessorsEditorContextProvider {...props}>
        <TestPipelineActions />
        <ProcessorsEditor />
        <GlobalOnFailureProcessorsEditor />
      </ProcessorsEditorContextProvider>
    </KibanaContextProvider>
  ),
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

    clickProcessorOutputTab() {
      act(() => {
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

    async clickProcessor(processorSelector: string) {
      await act(async () => {
        find(`${processorSelector}.manageItemButton`).simulate('click');
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
  | 'processorSettingsForm'
  | 'configurationTab'
  | 'outputTab'
  | 'processorOutputTabContent'
  | string;
