/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';

const app = uiModules.get('xpack/watcher');

app.controller('WatcherErrorsDisplayController', function WatcherErrorsDisplayController($modalInstance, params) {
  this.title =  params.title;
  this.errors = params.errors;

  this.close = function close() {
    $modalInstance.close();
  };
});
