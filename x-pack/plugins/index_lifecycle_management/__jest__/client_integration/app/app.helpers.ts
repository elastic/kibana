/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { HttpSetup } from '@kbn/core/public';
import { registerTestBed, TestBed, TestBedConfig } from '@kbn/test-jest-helpers';
import { App } from '../../../public/application/app';
import { WithAppDependencies } from '../helpers';

const getTestBedConfig = (initialEntries: string[]): TestBedConfig => ({
  memoryRouter: {
    initialEntries,
  },
  defaultProps: {
    getUrlForApp: () => {},
  },
});

export interface AppTestBed extends TestBed {
  actions: {
    clickPolicyNameLink: () => void;
    clickCreatePolicyButton: () => void;
  };
}

export const setup = async (
  httpSetup: HttpSetup,
  initialEntries: string[]
): Promise<AppTestBed> => {
  const initTestBed = registerTestBed(
    WithAppDependencies(App, httpSetup),
    getTestBedConfig(initialEntries)
  );
  const testBed = await initTestBed();

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

export const getEncodedPolicyEditPath = (policyName: string): string =>
  `/policies/edit/${encodeURIComponent(policyName)}`;

export const getDoubleEncodedPolicyEditPath = (policyName: string): string =>
  encodeURI(getEncodedPolicyEditPath(policyName));
