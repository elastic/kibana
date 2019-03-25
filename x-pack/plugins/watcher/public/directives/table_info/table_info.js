/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import template from './table_info.html';

const app = uiModules.get('kibana');

app.directive('tableInfo', function () {
  return {
    restrict: 'E',
    replace: true,
    template: template,
    transclude: true,
    controllerAs: 'tableInfo',
    bindToController: true,
    controller: class TableInfoController {
    }
  };
});
