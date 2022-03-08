/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { registerTestBed } from '@kbn/test-jest-helpers';

import { RemoteClusterAdd } from '../../../public/application/sections';
import { createRemoteClustersStore } from '../../../public/application/store';
import { AppRouter, registerRouter } from '../../../public/application/services';
import { createRemoteClustersActions } from '../helpers';
import { AppContextProvider } from '../../../public/application/app_context';

const ComponentWithContext = ({ isCloudEnabled }: { isCloudEnabled: boolean }) => {
  return (
    <AppContextProvider context={{ isCloudEnabled, cloudBaseUrl: 'test.com' }}>
      <RemoteClusterAdd />
    </AppContextProvider>
  );
};

const testBedConfig = ({ isCloudEnabled }: { isCloudEnabled: boolean }) => {
  return {
    store: createRemoteClustersStore,
    memoryRouter: {
      onRouter: (router: AppRouter) => registerRouter(router),
    },
    defaultProps: { isCloudEnabled },
  };
};

const initTestBed = (isCloudEnabled: boolean) =>
  registerTestBed(ComponentWithContext, testBedConfig({ isCloudEnabled }))();

export const setup = async (isCloudEnabled = false) => {
  const testBed = await initTestBed(isCloudEnabled);

  return {
    ...testBed,
    actions: {
      ...createRemoteClustersActions(testBed),
    },
  };
};
