/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed } from '../../../../../test_utils';

/* eslint-disable @kbn/eslint/no-restricted-paths */
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
  const clickSaveForm = () => {
    testBed.find('remoteClusterFormSaveButton').simulate('click');
  };

  return {
    ...testBed,
    actions: {
      clickSaveForm,
    },
  };
};
