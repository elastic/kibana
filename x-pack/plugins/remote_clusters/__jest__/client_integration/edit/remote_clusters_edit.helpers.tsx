/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTestBed, TestBedConfig } from '@kbn/test/jest';
import { HttpSetup } from 'src/core/public';

import { RemoteClusterEdit } from '../../../public/application/sections';
import { createRemoteClustersStore } from '../../../public/application/store';
import { AppRouter, registerRouter } from '../../../public/application/services';
import { createRemoteClustersActions, WithAppDependencies } from '../helpers';

export const REMOTE_CLUSTER_EDIT_NAME = 'new-york';

export const REMOTE_CLUSTER_EDIT = {
  name: REMOTE_CLUSTER_EDIT_NAME,
  seeds: ['localhost:9400'],
  skipUnavailable: true,
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

export const setup = async (httpSetup: HttpSetup, overrides?: Record<string, unknown>) => {
  const initTestBed = registerTestBed(
    WithAppDependencies(RemoteClusterEdit, httpSetup, overrides),
    testBedConfig
  );
  const testBed = await initTestBed();

  return {
    ...testBed,
    actions: {
      ...createRemoteClustersActions(testBed),
    },
  };
};
