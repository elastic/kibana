/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed, TestBed } from '../../../../../test_utils';
import { RepositoryAdd } from '../../../public/app/sections/repository_add';
import { WithProviders } from './providers';

const initTestBed = registerTestBed(WithProviders(RepositoryAdd));

export interface RepositoryAddTestBed extends TestBed<TestSubjects> {
  actions: {
    clickNextButton: () => void;
    clickSubmitButton: () => void;
    selectRepositoryType: (type: 'fs' | 'url') => void;
  };
}

export const setup = async (): Promise<RepositoryAddTestBed> => {
  const testBed = await initTestBed();

  // User actions
  const clickNextButton = () => {
    testBed.find('nextButton').simulate('click');
  };

  const clickSubmitButton = () => {
    testBed.find('submitButton').simulate('click');
  };

  const selectRepositoryType = (type: 'fs' | 'url') => {
    testBed
      .find(`${type}RepositoryType`)
      .find('button')
      .simulate('click');
  };

  return {
    ...testBed,
    actions: {
      clickNextButton,
      clickSubmitButton,
      selectRepositoryType,
    },
  };
};
