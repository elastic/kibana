/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed } from '../../../../../test_utils';
import { CrossClusterReplicationHome } from '../../../public/app/sections/home/home';
import { ccrStore } from '../../../public/app/store';
import routing from '../../../public/app/services/routing';
import { BASE_PATH } from '../../../common/constants';

const testBedConfig = {
  store: ccrStore,
  memoryRouter: {
    initialEntries: [`${BASE_PATH}/follower_indices`],
    componentRoutePath: `${BASE_PATH}/:section`,
    onRouter: (router) => routing.reactRouter = router
  }
};

export const setup = registerTestBed(CrossClusterReplicationHome, testBedConfig);
