/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTestBed } from '@kbn/test-jest-helpers';
import { HttpSetup } from 'src/core/public';

import { RemoteClusterAdd } from '../../../public/application/sections';
import { createRemoteClustersStore } from '../../../public/application/store';
import { AppRouter, registerRouter } from '../../../public/application/services';
import { createRemoteClustersActions, WithAppDependencies } from '../helpers';

const testBedConfig = {
  store: createRemoteClustersStore,
  memoryRouter: {
    onRouter: (router: AppRouter) => registerRouter(router),
  },
};

export const setup = async (httpSetup: HttpSetup, overrides?: Record<string, unknown>) => {
  const initTestBed = registerTestBed(
    WithAppDependencies(RemoteClusterAdd, httpSetup, overrides),
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
