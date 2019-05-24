/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed } from '../../../../../test_utils';
import { AutoFollowPatternEdit } from '../../../public/app/sections/auto_follow_pattern_edit';
import { ccrStore } from '../../../public/app/store';
import routing from '../../../public/app/services/routing';

import { AUTO_FOLLOW_PATTERN_EDIT_NAME } from './constants';

const testBedConfig = {
  store: ccrStore,
  memoryRouter: {
    onRouter: (router) => routing.reactRouter = router,
    // The auto-follow pattern id to fetch is read from the router ":id" param
    // so we first set it in our initial entries
    initialEntries: [`/${AUTO_FOLLOW_PATTERN_EDIT_NAME}`],
    // and then we declarae the :id param on the component route path
    componentRoutePath: '/:id'
  }
};

const initTestBed = registerTestBed(AutoFollowPatternEdit, testBedConfig);

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
