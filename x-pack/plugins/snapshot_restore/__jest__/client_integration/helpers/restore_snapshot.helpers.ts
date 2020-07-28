/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @kbn/eslint/no-restricted-paths */
import { registerTestBed, TestBed, TestBedConfig } from '../../../../../test_utils';
import { RestoreSnapshot } from '../../../public/application/sections/restore_snapshot';
import { WithAppDependencies } from './setup_environment';

const testBedConfig: TestBedConfig = {
  memoryRouter: {
    initialEntries: ['/add_policy'],
    componentRoutePath: '/add_policy',
  },
  doMountAsync: true,
};

const initTestBed = registerTestBed<RestoreSnapshotFormTestSubject>(
  WithAppDependencies(RestoreSnapshot),
  testBedConfig
);

const setupActions = (testBed: TestBed<RestoreSnapshotFormTestSubject>) => {
  const { find } = testBed;
  return {
    findDataStreamCallout() {
      return find('dataStreamWarningCallOut');
    },
  };
};

type Actions = ReturnType<typeof setupActions>;

export type RestoreSnapshotTestBed = TestBed<RestoreSnapshotFormTestSubject> & {
  actions: Actions;
};

export const setup = async (): Promise<RestoreSnapshotTestBed> => {
  const testBed = await initTestBed();

  return {
    ...testBed,
    actions: setupActions(testBed),
  };
};

export type RestoreSnapshotFormTestSubject =
  | 'snapshotRestoreStepLogistics'
  | 'dataStreamWarningCallOut';
