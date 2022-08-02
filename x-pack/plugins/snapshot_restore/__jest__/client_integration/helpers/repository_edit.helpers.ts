/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTestBed, AsyncTestBedConfig } from '@kbn/test-jest-helpers';
import { HttpSetup } from '@kbn/core/public';
import { RepositoryEdit } from '../../../public/application/sections/repository_edit';
import { WithAppDependencies } from './setup_environment';
import { REPOSITORY_NAME } from './constant';

const testBedConfig: AsyncTestBedConfig = {
  memoryRouter: {
    initialEntries: [`/${REPOSITORY_NAME}`],
    componentRoutePath: '/:name',
  },
  doMountAsync: true,
};

export const setup = async (httpSetup: HttpSetup) => {
  const initTestBed = registerTestBed<RepositoryEditTestSubjects>(
    WithAppDependencies(RepositoryEdit, httpSetup),
    testBedConfig
  );

  return await initTestBed();
};

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
