/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { act } from 'react-dom/test-utils';
import React from 'react';
import axios from 'axios';
import axiosXhrAdapter from 'axios/lib/adapters/xhr';

/* eslint-disable @kbn/eslint/no-restricted-paths */
import { usageCollectionPluginMock } from 'src/plugins/usage_collection/public/mocks';

import { registerTestBed, TestBed } from '@kbn/test/jest';
import { stubWebWorker } from '@kbn/test/jest';
import { uiMetricService, apiService } from '../../../../services';
import { Props } from '../../';
import { initHttpRequests } from '../http_requests.helpers';
import { ProcessorsEditorWithDeps } from '../processors_editor';

stubWebWorker();

jest.mock('../../../../../../../../../src/plugins/kibana_react/public', () => {
  const original = jest.requireActual('../../../../../../../../../src/plugins/kibana_react/public');
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
    // Mocking EuiComboBox, as it utilizes "react-virtualized" for rendering search suggestions,
    // which does not produce a valid component wrapper
    EuiComboBox: (props: any) => (
      <input
        data-test-subj={props['data-test-subj']}
        data-currentvalue={props.selectedOptions}
        onChange={async (syntheticEvent: any) => {
          props.onChange([syntheticEvent['0']]);
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
  const { find, component } = testBed;

  return {
    async saveNewProcessor() {
      await act(async () => {
        find('addProcessorForm.submitButton').simulate('click');
      });
      component.update();
    },

    async addProcessorType({ type, label }: { type: string; label: string }) {
      await act(async () => {
        find('processorTypeSelector.input').simulate('change', [{ value: type, label }]);
      });
      component.update();
    },

    addProcessor() {
      find('addProcessorButton').simulate('click');
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
  | 'addProcessorForm.submitButton'
  | 'addProcessorButton'
  | 'addProcessorForm.submitButton'
  | 'processorTypeSelector.input'
  | 'fieldNameField.input'
  | 'targetField.input'
  | 'keepOriginalField.input'
  | 'removeIfSuccessfulField.input';
