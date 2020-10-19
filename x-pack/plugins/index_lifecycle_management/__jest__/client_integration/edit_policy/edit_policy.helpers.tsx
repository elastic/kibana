/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';

import { registerTestBed, TestBedConfig } from '../../../../../test_utils';

import { POLICY_NAME } from './constants';
import { TestSubjects } from '../helpers';

import { EditPolicy } from '../../../public/application/sections/edit_policy';

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

const testBedConfig: TestBedConfig = {
  memoryRouter: {
    initialEntries: [`/policies/edit/${POLICY_NAME}`],
    componentRoutePath: `/policies/edit/:policyName`,
  },
  defaultProps: {
    getUrlForApp: () => {},
  },
};

const initTestBed = registerTestBed<TestSubjects>(EditPolicy, testBedConfig);

type SetupReturn = ReturnType<typeof setup>;

export type EditPolicyTestBed = SetupReturn extends Promise<infer U> ? U : SetupReturn;

export const setup = async () => {
  const testBed = await initTestBed();

  const { find, component } = testBed;

  const setWaitForSnapshotPolicy = async (snapshotPolicyName: string) => {
    act(() => {
      find('snapshotPolicyCombobox').simulate('change', [{ label: snapshotPolicyName }]);
    });
    component.update();
  };

  const savePolicy = async () => {
    await act(async () => {
      find('savePolicyButton').simulate('click');
    });
    component.update();
  };

  const toggleRollover = async (checked: boolean) => {
    await act(async () => {
      find('rolloverSwitch').simulate('click', { target: { checked } });
    });
    component.update();
  };

  const setMaxSize = async (value: string, units?: string) => {
    await act(async () => {
      find('hot-selectedMaxSizeStored').simulate('change', { target: { value } });
      if (units) {
        find('hot-selectedMaxSizeStoredUnits.select').simulate('change', {
          target: { value: units },
        });
      }
    });
    component.update();
  };

  const setMaxDocs = async (value: string) => {
    await act(async () => {
      find('hot-selectedMaxDocuments').simulate('change', { target: { value } });
    });
    component.update();
  };

  const setMaxAge = async (value: string, units?: string) => {
    await act(async () => {
      find('hot-selectedMaxAge').simulate('change', { target: { value } });
      if (units) {
        find('hot-selectedMaxAgeUnits.select').simulate('change', { target: { value: units } });
      }
    });
    component.update();
  };

  const toggleForceMerge = (phase: string) => async (checked: boolean) => {
    await act(async () => {
      find(`${phase}-forceMergeSwitch`).simulate('click', { target: { checked } });
    });
    component.update();
  };

  const setForcemergeSegmentsCount = (phase: string) => async (value: string) => {
    await act(async () => {
      find(`${phase}-selectedForceMergeSegments`).simulate('change', { target: { value } });
    });
    component.update();
  };

  const setBestCompression = (phase: string) => async (checked: boolean) => {
    await act(async () => {
      find(`${phase}-bestCompression`).simulate('click', { target: { checked } });
    });
    component.update();
  };

  const setIndexPriority = (phase: string) => async (value: string) => {
    await act(async () => {
      find(`${phase}-phaseIndexPriority`).simulate('change', { target: { value } });
    });
    component.update();
  };

  return {
    ...testBed,
    actions: {
      setWaitForSnapshotPolicy,
      savePolicy,
      hot: {
        setMaxSize,
        setMaxDocs,
        setMaxAge,
        toggleRollover,
        toggleForceMerge: toggleForceMerge('hot'),
        setForcemergeSegments: setForcemergeSegmentsCount('hot'),
        setBestCompression: setBestCompression('hot'),
        setIndexPriority: setIndexPriority('hot'),
      },
    },
  };
};
