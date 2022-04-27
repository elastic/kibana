/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTestBed, TestBed } from '@kbn/test-jest-helpers';
import { HttpSetup } from '@kbn/core/public';
import { RepositoryType } from '../../../common/types';
import { RepositoryAdd } from '../../../public/application/sections/repository_add';
import { WithAppDependencies } from './setup_environment';

export interface RepositoryAddTestBed extends TestBed<RepositoryAddTestSubjects> {
  actions: {
    clickNextButton: () => void;
    clickBackButton: () => void;
    clickSubmitButton: () => void;
    selectRepositoryType: (type: RepositoryType) => void;
  };
}

export const setup = async (httpSetup: HttpSetup): Promise<RepositoryAddTestBed> => {
  const initTestBed = registerTestBed<RepositoryAddTestSubjects>(
    WithAppDependencies(RepositoryAdd, httpSetup),
    {
      doMountAsync: true,
    }
  );
  const testBed = await initTestBed();

  // User actions
  const clickNextButton = () => {
    testBed.find('nextButton').simulate('click');
  };

  const clickBackButton = () => {
    testBed.find('backButton').simulate('click');
  };

  const clickSubmitButton = () => {
    testBed.find('submitButton').simulate('click');
  };

  const selectRepositoryType = (type: RepositoryType) => {
    const button = testBed.find(`${type}RepositoryType` as 'fsRepositoryType').find('button');
    if (!button.length) {
      throw new Error(`Repository type "${type}" button not found.`);
    }
    button.simulate('click');
  };

  return {
    ...testBed,
    actions: {
      clickNextButton,
      clickBackButton,
      clickSubmitButton,
      selectRepositoryType,
    },
  };
};

export type RepositoryAddTestSubjects = TestSubjects | NonVisibleTestSubjects;

type NonVisibleTestSubjects =
  | 'noRepositoryTypesError'
  | 'sectionLoading'
  | 'saveRepositoryApiError';

type TestSubjects =
  | 'backButton'
  | 'chunkSizeInput'
  | 'compressToggle'
  | 'fsRepositoryType'
  | 'locationInput'
  | 'clientInput'
  | 'containerInput'
  | 'basePathInput'
  | 'bucketInput'
  | 'pathInput'
  | 'uriInput'
  | 'bufferSizeInput'
  | 'maxRestoreBytesInput'
  | 'maxSnapshotBytesInput'
  | 'nameInput'
  | 'nextButton'
  | 'pageTitle'
  | 'readOnlyToggle'
  | 'repositoryForm'
  | 'repositoryForm.backButton'
  | 'repositoryForm.chunkSizeInput'
  | 'repositoryForm.compressToggle'
  | 'repositoryForm.fsRepositoryType'
  | 'repositoryForm.locationInput'
  | 'repositoryForm.maxRestoreBytesInput'
  | 'repositoryForm.maxSnapshotBytesInput'
  | 'repositoryForm.nameInput'
  | 'repositoryForm.nextButton'
  | 'repositoryForm.readOnlyToggle'
  | 'repositoryForm.repositoryFormError'
  | 'repositoryForm.sourceOnlyToggle'
  | 'repositoryForm.stepTwo'
  | 'repositoryForm.submitButton'
  | 'repositoryForm.title'
  | 'repositoryForm.urlRepositoryType'
  | 'repositoryFormError'
  | 'snapshotRestoreApp'
  | 'snapshotRestoreApp.backButton'
  | 'snapshotRestoreApp.chunkSizeInput'
  | 'snapshotRestoreApp.compressToggle'
  | 'snapshotRestoreApp.fsRepositoryType'
  | 'snapshotRestoreApp.locationInput'
  | 'snapshotRestoreApp.maxRestoreBytesInput'
  | 'snapshotRestoreApp.maxSnapshotBytesInput'
  | 'snapshotRestoreApp.nameInput'
  | 'snapshotRestoreApp.nextButton'
  | 'snapshotRestoreApp.pageTitle'
  | 'snapshotRestoreApp.readOnlyToggle'
  | 'snapshotRestoreApp.repositoryForm'
  | 'snapshotRestoreApp.repositoryFormError'
  | 'snapshotRestoreApp.sourceOnlyToggle'
  | 'snapshotRestoreApp.stepTwo'
  | 'snapshotRestoreApp.submitButton'
  | 'snapshotRestoreApp.title'
  | 'snapshotRestoreApp.urlRepositoryType'
  | 'sourceOnlyToggle'
  | 'stepTwo'
  | 'stepTwo.backButton'
  | 'stepTwo.chunkSizeInput'
  | 'stepTwo.compressToggle'
  | 'stepTwo.locationInput'
  | 'stepTwo.maxRestoreBytesInput'
  | 'stepTwo.maxSnapshotBytesInput'
  | 'stepTwo.readOnlyToggle'
  | 'stepTwo.submitButton'
  | 'stepTwo.title'
  | 'submitButton'
  | 'title'
  | 'urlRepositoryType';
