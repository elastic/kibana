/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed } from '../../../../../test_utils';
import { SnapshotRestoreHome } from '../../../public/app/sections/home/home';
import { BASE_PATH } from '../../../public/app/constants';
import { WithAppDependencies } from './providers';

const testBedConfig = {
  memoryRouter: {
    initialEntries: [`${BASE_PATH}/repositories`],
    componentRoutePath: `${BASE_PATH}/:section(repositories|snapshots)/:repositoryName?/:snapshotId*`,
  },
};

export const setup = registerTestBed(WithAppDependencies(SnapshotRestoreHome), testBedConfig);
