/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import template from './full_time_range_selector.html';

import { FullTimeRangeSelectorServiceProvider } from 'plugins/ml/components/full_time_range_selector/full_time_range_selector_service';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('mlFullTimeRangeSelector', function (Private) {
  return {
    restrict: 'E',
    replace: true,
    template,
    scope: {
      indexPattern: '=',
      disabled: '=',
      query: '='
    },
    controller: function ($scope) {
      const mlFullTimeRangeSelectorService = Private(FullTimeRangeSelectorServiceProvider);

      $scope.setFullTimeRange = function () {
        mlFullTimeRangeSelectorService.setFullTimeRange($scope.indexPattern, $scope.query);
      };
    }
  };
});
