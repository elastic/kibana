/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import moment from 'moment';
import $ from 'jquery';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.controller('MlNewEventModal', function (
  $scope,
  $modalInstance,
  $timeout) {

  const RANGE_TYPE = {
    SINGLE_DAY: '0',
    DAY_RANGE: '1',
    TIME_RANGE: '2',
  };
  $scope.RANGE_TYPE = RANGE_TYPE;
  const MODAL_WIDTH_SMALL = 425;
  const MODAL_WIDTH_LARGE = 700;

  $scope.event = {
    description: '',
    start: '',
    end: ''
  };

  $scope.ui = {
    saveEnabled() {
      return ($scope.ui.description !== '' && $scope.ui.description !== undefined);
    },
    description: '',
    rangeType: RANGE_TYPE.SINGLE_DAY,
    timepicker: {
      start: moment().startOf('day'),
      end: moment().startOf('day').add(1, 'days')
    },
    setRangeType(i, event) {
      if (event && event.preventDefault) {
        event.preventDefault();
      }

      $scope.ui.rangeType = i;
      let width = MODAL_WIDTH_SMALL;
      if (i === RANGE_TYPE.SINGLE_DAY) {
        width = MODAL_WIDTH_SMALL;
      } else if (i === RANGE_TYPE.DAY_RANGE || i === RANGE_TYPE.TIME_RANGE) {
        width = MODAL_WIDTH_LARGE;
      }
      $('.modal-dialog').width(width);
    }
  };


  $timeout(() => {
    $scope.ui.setRangeType('0');
    $('.ml-new-event-contents #id').focus();
  }, 0);

  function extractForm() {
    let start = null;
    let end = null;

    const startMoment = moment($scope.ui.timepicker.start);
    if ($scope.ui.rangeType === RANGE_TYPE.SINGLE_DAY) {
      const endMoment = moment($scope.ui.timepicker.start);
      start = startMoment.startOf('day');
      end = endMoment.startOf('day').add(1, 'days');
    }
    else if ($scope.ui.rangeType === RANGE_TYPE.DAY_RANGE) {
      const endMoment = moment($scope.ui.timepicker.end);
      start = startMoment.startOf('day');
      end = endMoment.startOf('day').add(1, 'days');
    }
    else if ($scope.ui.rangeType === RANGE_TYPE.TIME_RANGE) {
      start = startMoment;
      end = moment($scope.ui.timepicker.end);
    }

    return{
      description: $scope.ui.description,
      start_time: start.valueOf(),
      end_time: end.valueOf()
    };
  }

  $scope.save = function () {
    const event = extractForm();
    $modalInstance.close(event);
  };

  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  };
});
