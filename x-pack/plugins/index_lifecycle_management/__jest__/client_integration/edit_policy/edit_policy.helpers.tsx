/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';

import { registerTestBed, TestBed, TestBedConfig } from '../../../../../test_utils';

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

const initTestBed = registerTestBed(EditPolicy, testBedConfig);

export interface EditPolicyTestBed extends TestBed<TestSubjects> {
  actions: {
    setWaitForSnapshotPolicy: (snapshotPolicyName: string) => void;
    savePolicy: () => void;
  };
}

export const setup = async (): Promise<EditPolicyTestBed> => {
  const testBed = await initTestBed();

  const setWaitForSnapshotPolicy = async (snapshotPolicyName: string) => {
    const { component } = testBed;
    act(() => {
      testBed.find('snapshotPolicyCombobox').simulate('change', [{ label: snapshotPolicyName }]);
    });
    component.update();
  };

  const savePolicy = async () => {
    const { component, find } = testBed;
    await act(async () => {
      find('savePolicyButton').simulate('click');
    });
    component.update();
  };

  return {
    ...testBed,
    actions: {
      setWaitForSnapshotPolicy,
      savePolicy,
    },
  };
};
