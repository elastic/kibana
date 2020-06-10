/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed } from '../../../../../../test_utils';
import { FollowerIndexAdd } from '../../../app/sections/follower_index_add';
import { ccrStore } from '../../../app/store';
import { routing } from '../../../app/services/routing';

const testBedConfig = {
  store: ccrStore,
  memoryRouter: {
    onRouter: (router) =>
      (routing.reactRouter = {
        ...router,
        getUrlForApp: () => '',
      }),
  },
};

const initTestBed = registerTestBed(FollowerIndexAdd, testBedConfig);

export const setup = (props) => {
  const testBed = initTestBed(props);

  // User actions
  const clickSaveForm = () => {
    testBed.find('submitButton').simulate('click');
  };

  const toggleAdvancedSettings = () => {
    testBed.form.toggleEuiSwitch('advancedSettingsToggle');
  };

  return {
    ...testBed,
    actions: {
      clickSaveForm,
      toggleAdvancedSettings,
    },
  };
};
