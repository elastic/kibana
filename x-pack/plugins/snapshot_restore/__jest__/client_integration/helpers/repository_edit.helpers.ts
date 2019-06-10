/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed, TestBedConfig } from '../../../../../test_utils';
import { RepositoryEdit } from '../../../public/app/sections/repository_edit';
import { WithProviders } from './providers';
import { REPOSITORY_NAME } from './constant';

const testBedConfig: TestBedConfig = {
  memoryRouter: {
    initialEntries: [`/${REPOSITORY_NAME}`],
    componentRoutePath: '/:name',
  },
  doMountAsync: true,
};

export const setup = registerTestBed<RepositoryEditTestSubjects>(
  WithProviders(RepositoryEdit),
  testBedConfig
);

export type RepositoryEditTestSubjects = TestSubjects | ThreeLevelDepth | NonVisibleTestSubjects;

type NonVisibleTestSubjects =
  | 'uriInput'
  | 'schemeSelect'
  | 'clientInput'
  | 'containerInput'
  | 'basePathInput'
  | 'maxSnapshotBytesInput'
  | 'locationModeSelect'
  | 'bucketInput'
  | 'urlInput'
  | 'pathInput'
  | 'loadDefaultsToggle'
  | 'securityPrincipalInput'
  | 'serverSideEncryptionToggle'
  | 'bufferSizeInput'
  | 'cannedAclSelect'
  | 'storageClassSelect';

type ThreeLevelDepth = 'repositoryForm.stepTwo.title';

type TestSubjects =
  | 'chunkSizeInput'
  | 'compressToggle'
  | 'locationInput'
  | 'maxRestoreBytesInput'
  | 'maxSnapshotBytesInput'
  | 'readOnlyToggle'
  | 'repositoryForm'
  | 'repositoryForm.chunkSizeInput'
  | 'repositoryForm.compressToggle'
  | 'repositoryForm.locationInput'
  | 'repositoryForm.maxRestoreBytesInput'
  | 'repositoryForm.maxSnapshotBytesInput'
  | 'repositoryForm.readOnlyToggle'
  | 'repositoryForm.stepTwo'
  | 'repositoryForm.submitButton'
  | 'repositoryForm.title'
  | 'snapshotRestoreApp'
  | 'snapshotRestoreApp.chunkSizeInput'
  | 'snapshotRestoreApp.compressToggle'
  | 'snapshotRestoreApp.locationInput'
  | 'snapshotRestoreApp.maxRestoreBytesInput'
  | 'snapshotRestoreApp.maxSnapshotBytesInput'
  | 'snapshotRestoreApp.readOnlyToggle'
  | 'snapshotRestoreApp.repositoryForm'
  | 'snapshotRestoreApp.stepTwo'
  | 'snapshotRestoreApp.submitButton'
  | 'snapshotRestoreApp.title'
  | 'stepTwo'
  | 'stepTwo.chunkSizeInput'
  | 'stepTwo.compressToggle'
  | 'stepTwo.locationInput'
  | 'stepTwo.maxRestoreBytesInput'
  | 'stepTwo.maxSnapshotBytesInput'
  | 'stepTwo.readOnlyToggle'
  | 'stepTwo.submitButton'
  | 'stepTwo.title'
  | 'submitButton'
  | 'title';
