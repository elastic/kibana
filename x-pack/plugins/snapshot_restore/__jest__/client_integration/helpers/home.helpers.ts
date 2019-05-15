/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed, findTestSubject } from '../../../../../test_utils';
import { SnapshotRestoreHome } from '../../../public/app/sections/home/home';
import { BASE_PATH } from '../../../public/app/constants';
import { WithProviders } from './providers';

const testBedConfig = {
  memoryRouter: {
    initialEntries: [`${BASE_PATH}/repositories`],
    componentRoutePath: `${BASE_PATH}/:section(repositories|snapshots)/:repositoryName?/:snapshotId*`,
  },
};

const initTestBed = registerTestBed(WithProviders(SnapshotRestoreHome), testBedConfig);

export const setup = async () => {
  const testBed = await initTestBed();
  const TABLE = 'repositoryTable';

  /**
   * User Actions
   */

  const selectRepositoryAt = (index = 0) => {
    const { rows } = testBed.table.getMetaData(TABLE);
    const row = rows[index];
    const checkBox = row.reactWrapper.find('input').hostNodes();
    checkBox.simulate('change', { target: { checked: true } });
  };

  const clickRepositoryAt = (index = 0) => {
    const { rows } = testBed.table.getMetaData(TABLE);
    const repositoryLink = findTestSubject(rows[index].reactWrapper, 'repositoryLink');
    repositoryLink.simulate('click');
  };

  return {
    ...testBed,
    actions: {
      selectRepositoryAt,
      clickRepositoryAt,
    },
  };
};
