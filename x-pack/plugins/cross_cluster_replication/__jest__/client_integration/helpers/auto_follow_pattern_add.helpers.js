/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed } from '../../../../../test_utils';
import { AutoFollowPatternAdd } from '../../../public/app/sections/auto_follow_pattern_add';
import { ccrStore } from '../../../public/app/store';
import routing from '../../../public/app/services/routing';

const testBedConfig = {
  store: ccrStore,
  memoryRouter: {
    onRouter: (router) => routing.reactRouter = router
  }
};

const initTestBed = registerTestBed(AutoFollowPatternAdd, testBedConfig);

export const setup = (props) => {
  const testBed = initTestBed(props);

  // User actions
  const clickSaveForm = () => {
    testBed.find('submitButton').simulate('click');
  };

  return {
    ...testBed,
    actions: {
      clickSaveForm
    }
  };
};
