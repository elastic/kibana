/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed } from '../../../../../test_utils';
import { FollowerIndexEdit } from '../../../public/app/sections/follower_index_edit';
import { ccrStore } from '../../../public/app/store';
import routing from '../../../public/app/services/routing';

import { FOLLOWER_INDEX_EDIT_NAME } from './constants';

const testBedConfig = {
  store: ccrStore,
  memoryRouter: {
    onRouter: (router) => routing.reactRouter = router,
    // The follower index id to fetch is read from the router ":id" param
    // so we first set it in our initial entries
    initialEntries: [`/${FOLLOWER_INDEX_EDIT_NAME}`],
    // and then we declarae the :id param on the component route path
    componentRoutePath: '/:id'
  }
};

const initTestBed = registerTestBed(FollowerIndexEdit, testBedConfig);

export const setup = (props) => {
  const testBed = initTestBed(props);

  // User actions
  const clickSaveForm = () => {
    testBed.find('submitButton').simulate('click');
  };

  const toggleAdvancedSettings = () => {
    testBed.form.selectCheckBox('advancedSettingsToggle');
  };

  return {
    ...testBed,
    actions: {
      clickSaveForm,
      toggleAdvancedSettings
    }
  };
};
