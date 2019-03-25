/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import { DirtyPrompt } from './dirty_prompt';

uiModules.get('kibana')
  .factory('dirtyPrompt', ($injector) => {
    const $window = $injector.get('$window');
    const confirmModal = $injector.get('confirmModal');
    const $rootScope = $injector.get('$rootScope');

    return new DirtyPrompt($window, $rootScope, confirmModal);
  });
