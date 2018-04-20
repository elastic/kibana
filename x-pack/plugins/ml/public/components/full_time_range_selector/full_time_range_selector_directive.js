/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import moment from 'moment';
import template from './full_time_range_selector.html';

import { FieldsServiceProvider } from 'plugins/ml/services/fields_service';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('mlFullTimeRangeSelector', function (mlFullTimeRangeSelectorService) {
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
      $scope.setFullTimeRange = function () {
        mlFullTimeRangeSelectorService.setFullTimeRange($scope.indexPattern, $scope.query);
      };
    }
  };
})
  .service('mlFullTimeRangeSelectorService', function (
    timefilter,
    Notifier,
    Private) {

    const notify = new Notifier();
    const fieldsService = Private(FieldsServiceProvider);

    // called on button press
    this.setFullTimeRange = function (indexPattern, query) {
      // load the earliest and latest time stamps for the index
      fieldsService.getTimeFieldRange(
        indexPattern.title,
        indexPattern.timeFieldName,
        query)
        .then((resp) => {
          timefilter.time.from = moment(resp.start.epoch).toISOString();
          timefilter.time.to = moment(resp.end.epoch).toISOString();
        })
        .catch((resp) => {
          notify.error(resp);
        });
    };
  });
