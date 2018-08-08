/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import template from './form_filter_input.html';

import angular from 'angular';
import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('mlFormFilterInput', function () {
  return {
    scope: {
      placeholder: '@?',
      filter: '=',
      filterIcon: '=',
      filterChanged: '=',
      clearFilter: '='
    },
    restrict: 'E',
    replace: false,
    template,
    link(scope) {
      scope.placeholder = angular.isDefined(scope.placeholder) ? scope.placeholder : 'Filter';
    }
  };
});
