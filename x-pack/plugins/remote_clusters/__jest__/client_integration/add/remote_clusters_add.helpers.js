/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { registerTestBed } from '@kbn/test/jest';

import { RemoteClusterAdd } from '../../../public/application/sections/remote_cluster_add';
import { createRemoteClustersStore } from '../../../public/application/store';
import { registerRouter } from '../../../public/application/services/routing';

const testBedConfig = {
  store: createRemoteClustersStore,
  memoryRouter: {
    onRouter: (router) => registerRouter(router),
  },
};

const initTestBed = registerTestBed(RemoteClusterAdd, testBedConfig);

export const setup = (props) => {
  const testBed = initTestBed(props);

  // User actions
  const clickSaveForm = async () => {
    await act(async () => {
      testBed.find('remoteClusterFormSaveButton').simulate('click');
    });

    testBed.component.update();
  };

  return {
    ...testBed,
    actions: {
      clickSaveForm,
    },
  };
};
