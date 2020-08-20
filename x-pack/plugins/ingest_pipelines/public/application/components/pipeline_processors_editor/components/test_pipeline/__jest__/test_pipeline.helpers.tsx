/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { act } from 'react-dom/test-utils';
import React from 'react';

import { notificationServiceMock, scopedHistoryMock } from 'src/core/public/mocks';

import { LocationDescriptorObject } from 'history';
import { KibanaContextProvider } from 'src/plugins/kibana_react/public';
import { registerTestBed, TestBed } from '../../../../../../../../../test_utils';
import { stubWebWorker } from '../../../../../../../../../test_utils/stub_web_worker';
import { ProcessorsEditorContextProvider, Props } from '../../../';
import { TestPipelineActions } from '../';

import {
  breadcrumbService,
  uiMetricService,
  documentationService,
  apiService,
} from '../../../../../services';

stubWebWorker();

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
};

const testBedSetup = registerTestBed<TestSubject>(
  (props: Props) => (
    <KibanaContextProvider services={appServices}>
      <ProcessorsEditorContextProvider {...props}>
        <TestPipelineActions />
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
  | 'documentsTab';
