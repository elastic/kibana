/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act } from 'react-dom/test-utils';
import { registerTestBed, TestBed, TestBedConfig } from '../../../../../test_utils';
import { App } from '../../../public/application/app';
import { TestSubjects } from '../helpers';

const getTestBedConfig = (initialEntries: string[]): TestBedConfig => ({
  memoryRouter: {
    initialEntries,
  },
  defaultProps: {
    getUrlForApp: () => {},
    navigateToApp: () => {},
  },
});

const initTestBed = (initialEntries: string[]) =>
  registerTestBed(App, getTestBedConfig(initialEntries))();

export interface AppTestBed extends TestBed<TestSubjects> {
  actions: {
    clickPolicyNameLink: () => void;
    clickCreatePolicyButton: () => void;
  };
}

export const setup = async (initialEntries: string[]): Promise<AppTestBed> => {
  const testBed = await initTestBed(initialEntries);

  const clickPolicyNameLink = async () => {
    const { component, find } = testBed;
    await act(async () => {
      find('policyTablePolicyNameLink').simulate('click', { button: 0 });
    });
    component.update();
  };

  const clickCreatePolicyButton = async () => {
    const { component, find } = testBed;
    await act(async () => {
      find('createPolicyButton').simulate('click', { button: 0 });
    });
    component.update();
  };

  return {
    ...testBed,
    actions: { clickPolicyNameLink, clickCreatePolicyButton },
  };
};
