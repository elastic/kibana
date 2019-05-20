/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed } from '../../../../../test_utils';
import { RepositoryEdit } from '../../../public/app/sections/repository_edit';
import { WithProviders } from './providers';
import { REPOSITORY_NAME } from './constant';

const testBedConfig = {
  memoryRouter: {
    initialEntries: [`/${REPOSITORY_NAME}`],
    componentRoutePath: '/:name',
  },
};

export const setup = registerTestBed<TestSubjects>(WithProviders(RepositoryEdit), testBedConfig);

export type TestSubjects =
  | 'chunkSizeInput'
  | 'compressToggle'
  | 'locationInput'
  | 'maxRestoreBytesInput'
  | 'maxSnashotBytesInput'
  | 'readOnlyToggle'
  | 'repositoryForm'
  | 'snapshotRestoreApp'
  | 'snapshotRestoreApp.repositoryForm.stepTwo'
  | 'snapshotRestoreApp.repositoryForm.stepTwo.chunkSizeInput'
  | 'snapshotRestoreApp.repositoryForm.stepTwo.compressToggle'
  | 'snapshotRestoreApp.repositoryForm.stepTwo.locationInput'
  | 'snapshotRestoreApp.repositoryForm.stepTwo.maxRestoreBytesInput'
  | 'snapshotRestoreApp.repositoryForm.stepTwo.maxSnashotBytesInput'
  | 'snapshotRestoreApp.repositoryForm.stepTwo.readOnlyToggle'
  | 'snapshotRestoreApp.repositoryForm.stepTwo.submitButton'
  | 'snapshotRestoreApp.repositoryForm.stepTwo.title'
  | 'stepTwo'
  | 'submitButton'
  | 'title';
