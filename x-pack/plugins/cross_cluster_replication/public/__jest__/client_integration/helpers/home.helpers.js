/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TestUtils } from '../../../../../../../src/plugins/es_ui_shared/public';
import { BASE_PATH } from '../../../../common/constants';
import { CrossClusterReplicationHome } from '../../../app/sections/home/home';
import { ccrStore } from '../../../app/store';
import { routing } from '../../../app/services/routing';

const { registerTestBed } = TestUtils;
const testBedConfig = {
  store: ccrStore,
  memoryRouter: {
    initialEntries: [`${BASE_PATH}/follower_indices`],
    componentRoutePath: `${BASE_PATH}/:section`,
    onRouter: router => (routing.reactRouter = router),
  },
};

export const setup = registerTestBed(CrossClusterReplicationHome, testBedConfig);
