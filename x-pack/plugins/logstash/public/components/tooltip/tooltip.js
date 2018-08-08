/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import template from './tooltip.html';
import './tooltip.less';

const app = uiModules.get('xpack/logstash');

app.directive('logstashTooltip', function () {
  return {
    restrict: 'E',
    template: template,
    scope: {
      text: '@'
    },
    bindToController: true,
    controllerAs: 'tooltip',
    controller: class TooltipController {}
  };
});
