/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed } from '../../../../../test_utils';
import { RepositoryAdd } from '../../../public/app/sections/repository_add';
import { WithProviders } from './providers';

const initTestBed = registerTestBed(WithProviders(RepositoryAdd));

export const setup = async () => {
  const testBed = await initTestBed();

  // User actions
  const clickNextButton = () => {
    testBed.find('nextButton').simulate('click');
  };

  return {
    ...testBed,
    actions: {
      clickNextButton,
    },
  };
};
