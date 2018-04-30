/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import template from './expression_popover.html';
import './expression_popover.less';

const app = uiModules.get('xpack/watcher');

app.directive('expressionPopover', function () {
  return {
    restrict: 'E',
    replace: true,
    require: '^expressionItem',
    transclude: true,
    template: template,
    scope: {
      popoverTitle: '='
    },
    bindToController: true,
    controllerAs: 'expressionPopover',
    controller: class ExpressionPopoverController {
      constructor() { }
    }
  };
});
