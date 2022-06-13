/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { registerTestBed, TestBed, TestBedConfig } from '@kbn/test-jest-helpers';
import { docLinksServiceMock, executionContextServiceMock } from 'src/core/public/mocks';
import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';
import { createBreadcrumbsMock } from '../../../public/application/services/breadcrumbs.mock';
import { licensingMock } from '../../../../licensing/public/mocks';
import { App } from '../../../public/application/app';

const breadcrumbService = createBreadcrumbsMock();

const AppWithContext = (props: any) => {
  return (
    <KibanaContextProvider
      services={{
        breadcrumbService,
        license: licensingMock.createLicense(),
        docLinks: docLinksServiceMock.createStartContract(),
        executionContext: executionContextServiceMock.createStartContract(),
      }}
    >
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
  },
});

const initTestBed = (initialEntries: string[]) =>
  registerTestBed(AppWithContext, getTestBedConfig(initialEntries))();

export interface AppTestBed extends TestBed {
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
