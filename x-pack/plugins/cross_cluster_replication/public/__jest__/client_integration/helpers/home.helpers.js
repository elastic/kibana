/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed } from '../../../../../../test_utils';
import { CrossClusterReplicationHome } from '../../../app/sections/home/home';
import { ccrStore } from '../../../app/store';
import { routing } from '../../../app/services/routing';

const testBedConfig = {
  store: ccrStore,
  memoryRouter: {
    initialEntries: [`/follower_indices`],
    componentRoutePath: `/:section`,
    onRouter: (router) => (routing.reactRouter = router),
  },
};

export const setup = registerTestBed(CrossClusterReplicationHome, testBedConfig);
