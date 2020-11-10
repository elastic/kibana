/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { registerTestBed, TestBed, TestBedConfig } from '../../../../../test_utils';
import { App } from '../../../public/application/app';
import { TestSubjects } from '../helpers';
import { createBreadcrumbsMock } from '../../../public/application/services/breadcrumbs.mock';
import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public/context';

const breadcrumbService = createBreadcrumbsMock();

const AppWithContext = (props: any) => {
  return (
    <KibanaContextProvider services={{ breadcrumbService }}>
      <App {...props} />
    </KibanaContextProvider>
  );
};

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
  registerTestBed(AppWithContext, getTestBedConfig(initialEntries))();

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

export const getEncodedPolicyEditPath = (policyName: string): string =>
  `/policies/edit/${encodeURIComponent(policyName)}`;

export const getDoubleEncodedPolicyEditPath = (policyName: string): string =>
  encodeURI(getEncodedPolicyEditPath(policyName));
