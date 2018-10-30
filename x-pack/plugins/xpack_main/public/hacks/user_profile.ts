/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
// @ts-ignore
import { uiModules } from 'ui/modules';
import { UserProfile } from '../../common';

uiModules.get('userProfile').provider('userProfile', function userProfileProvider() {
  // @ts-ignore
  this.$get = () => {
    return new UserProfile(chrome.getInjected('userProfileData'));
  };
});
