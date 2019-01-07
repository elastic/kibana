/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
* AngularJS service for storing limit values in AppState.
*/

import { stateFactoryProvider } from 'plugins/ml/factories/state_factory';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.service('mlSelectLimitService', function (Private) {
  const stateFactory = Private(stateFactoryProvider);
  this.state = stateFactory('mlSelectLimit', {
    limit: { display: '10', val: 10 }
  });
});
