/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import template from './action_status_table.html';

const app = uiModules.get('xpack/watcher');

app.directive('actionStatusTable', function () {
  return {
    restrict: 'E',
    replace: true,
    template: template,
    scope: {
      actionStatuses: '=',
      sortField: '=',
      sortReverse: '=',
      onSortChange: '=',
      onActionAcknowledge: '=',
    },
    bindToController: true,
    controllerAs: 'actionStatusTable',
    controller: class ActionStatusTableController {}
  };
});
