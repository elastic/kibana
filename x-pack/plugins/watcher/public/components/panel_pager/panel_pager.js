/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import template from './panel_pager.html';
import './panel_pager.less';

const app = uiModules.get('xpack/watcher');

app.directive('panelPager', function () {
  return {
    restrict: 'E',
    replace: true,
    template: template,
    scope: {
      onNextPage: '=',
      onPreviousPage: '='
    },
    bindToController: true,
    controllerAs: 'panelPager',
    controller: class PanelPagerController {
      constructor() {
      }
    }
  };
});
