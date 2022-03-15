/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTestBed, TestBedConfig } from '@kbn/test-jest-helpers';

import React from 'react';
import { RemoteClusterEdit } from '../../../public/application/sections';
import { createRemoteClustersStore } from '../../../public/application/store';
import { AppRouter, registerRouter } from '../../../public/application/services';
import { createRemoteClustersActions } from '../helpers';
import { AppContextProvider } from '../../../public/application/app_context';

export const REMOTE_CLUSTER_EDIT_NAME = 'new-york';

export const REMOTE_CLUSTER_EDIT = {
  name: REMOTE_CLUSTER_EDIT_NAME,
  seeds: ['localhost:9400'],
  skipUnavailable: true,
};

const ComponentWithContext = (props: { isCloudEnabled: boolean }) => {
  const { isCloudEnabled, ...rest } = props;
  return (
    <AppContextProvider context={{ isCloudEnabled, cloudBaseUrl: 'test.com' }}>
      <RemoteClusterEdit {...rest} />
    </AppContextProvider>
  );
};

const testBedConfig: TestBedConfig = {
  store: createRemoteClustersStore,
  memoryRouter: {
    onRouter: (router: AppRouter) => registerRouter(router),
    // The remote cluster name to edit is read from the router ":id" param
    // so we first set it in our initial entries
    initialEntries: [`/${REMOTE_CLUSTER_EDIT_NAME}`],
    // and then we declare the :id param on the component route path
    componentRoutePath: '/:name',
  },
};

const initTestBed = (isCloudEnabled: boolean) =>
  registerTestBed(ComponentWithContext, testBedConfig)({ isCloudEnabled });

export const setup = async (isCloudEnabled = false) => {
  const testBed = await initTestBed(isCloudEnabled);

  return {
    ...testBed,
    actions: {
      ...createRemoteClustersActions(testBed),
    },
  };
};
