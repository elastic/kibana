/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { TestBedConfig, registerTestBed } from '@kbn/test-jest-helpers';

import { Cluster } from '../../../public';
import { RemoteClusterEdit } from '../../../public/application/sections';
import { AppRouter, registerRouter } from '../../../public/application/services';
import { createRemoteClustersStore } from '../../../public/application/store';
import { WithAppDependencies, createRemoteClustersActions } from '../helpers';

export const REMOTE_CLUSTER_EDIT_NAME = 'new-york';

export const REMOTE_CLUSTER_EDIT: Cluster = {
  name: REMOTE_CLUSTER_EDIT_NAME,
  seeds: ['localhost:9400'],
  skipUnavailable: true,
  securityModel: 'certificate',
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
