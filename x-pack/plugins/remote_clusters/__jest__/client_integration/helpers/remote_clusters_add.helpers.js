/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed } from '../../../../../test_utils';
import { RemoteClusterAdd } from '../../../public/sections/remote_cluster_add';
import { createRemoteClustersStore } from '../../../public/store';
import { registerRouter } from '../../../public/services/routing';

const testBedOptions = {
  memoryRouter: {
    onRouter: (router) => registerRouter(router)
  }
};

const initTestBed = registerTestBed(RemoteClusterAdd, { options: testBedOptions, store: createRemoteClustersStore });

export const setup = (props) => {
  const testBed = initTestBed(props);

  // User actions
  const clickSaveForm = () => {
    testBed.find('remoteClusterFormSaveButton').simulate('click');
  };

  return {
    ...testBed,
    actions: {
      clickSaveForm
    }
  };
};
