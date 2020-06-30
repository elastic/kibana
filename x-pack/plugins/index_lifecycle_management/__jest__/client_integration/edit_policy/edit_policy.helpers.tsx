/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act } from 'react-dom/test-utils';

import { registerTestBed, TestBed, TestBedConfig } from '../../../../../test_utils';

import { POLICY_NAME } from './constants';
import { TestSubjects } from '../helpers';

import { EditPolicy } from '../../../public/application/sections/edit_policy';
import { indexLifecycleManagementStore } from '../../../public/application/store';

const testBedConfig: TestBedConfig = {
  store: () => indexLifecycleManagementStore(),
  memoryRouter: {
    initialEntries: [`/policies/edit/${POLICY_NAME}`],
    componentRoutePath: `/policies/edit/:policyName`,
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

  const setWaitForSnapshotPolicy = (snapshotPolicyName: string) => {
    const { component, form } = testBed;
    form.setInputValue('waitForSnapshotField', snapshotPolicyName, true);
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
