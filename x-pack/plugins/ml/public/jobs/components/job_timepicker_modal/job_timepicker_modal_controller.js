/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import moment from 'moment';
import angular from 'angular';

import { mlJobService } from 'plugins/ml/services/job_service';
import { mlMessageBarService } from 'plugins/ml/components/messagebar/messagebar_service';
import { xpackFeatureProvider } from 'plugins/ml/license/check_license';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.controller('MlJobTimepickerModal', function (
  $scope,
  $rootScope,
  $modalInstance,
  params,
  Private,
  i18n) {
  const msgs = mlMessageBarService;
  $scope.saveLock = false;
  const xpackFeature = Private(xpackFeatureProvider);
  $scope.watcherEnabled = xpackFeature.isAvailable('watcher');

  const job = angular.copy(params.job);
  $scope.jobId = job.job_id;

  $scope.datafeedId = mlJobService.getDatafeedId(job.job_id);

  $scope.start = '';
  $scope.end = '';

  let lastTime = '';
  if (job.data_counts && job.data_counts.latest_record_timestamp) {
    const time = moment(job.data_counts.latest_record_timestamp);
    lastTime = time.format('YYYY-MM-DD HH:mm:ss');
  }

  $scope.isNew = (job.data_counts && job.data_counts.input_record_count > 0) ? false : true;

  $scope.startAtBeginningOfDataLabel = i18n('xpack.ml.jobTimePickerModal.startAtBeginningOfDataLabel', {
    defaultMessage: 'Start at beginning of data'
  });
  $scope.continueFromLastTime = i18n('xpack.ml.jobTimePickerModal.continueFromLastTimeLabel', {
    defaultMessage: 'Continue from {lastTime}',
    values: { lastTime }
  });
  $scope.startNowLabel = i18n('xpack.ml.jobTimePickerModal.startNowLabel', {
    defaultMessage: 'Start now'
  });
  $scope.continueFromNowLabel = i18n('xpack.ml.jobTimePickerModal.continueFromNowLabel', {
    defaultMessage: 'Continue from now'
  });
  $scope.specifyStartTimeLabel = i18n('xpack.ml.jobTimePickerModal.specifyStartTimeLabel', {
    defaultMessage: 'Specify start time'
  });
  $scope.continueFromSpecifiedTimeLabel = i18n('xpack.ml.jobTimePickerModal.continueFromSpecifiedTimeLabel', {
    defaultMessage: 'Continue from specified time'
  });

  $scope.ui = {
    lastTime: lastTime,
    startDateText: '',
    startRadio: '1',
    endDateText: '',
    endRadio: '1',
    timepicker: {
      from: '',
      to: moment()
    },
    setStartRadio: function (i) {
      $scope.ui.startRadio = i;
    },
    createWatch: false
  };

  function extractForm() {
    if ($scope.ui.startRadio === '0') {
      $scope.start = 'now';
    }
    else if ($scope.ui.startRadio === '1') {
      $scope.start = '0';
    }
    else if ($scope.ui.startRadio === '2') {
      $scope.start = moment($scope.ui.timepicker.from).unix() * 1000;
    }

    if ($scope.ui.endRadio === '0') {
      $scope.end = undefined;
    } else if ($scope.ui.endRadio === '1') {
      $scope.end = moment($scope.ui.timepicker.to).unix() * 1000;
    }
  }

  $scope.save = function () {
    $scope.saveLock = true;

    extractForm();

    let doStartCalled = false;
    // in 10s call the function to start the datafeed.
    // if the job has already opened and doStart has already been called, nothing will happen.
    // However, if the job is still waiting to be opened, the datafeed can be started anyway.
    window.setTimeout(doStart, 10000);

    // Attempt to open the job first.
    // If it's already open, ignore the 409 error
    mlJobService.openJob($scope.jobId)
      .then(() => {
        doStart();
      })
      .catch((resp) => {
        const couldNotOpenJobErrorMessage = i18n('xpack.ml.jobTimePickerModal.couldNotOpenJobErrorMessage', {
          defaultMessage: 'Could not open {jobId}',
          values: { jobId: $scope.jobId }
        });
        if (resp.statusCode === 409) {
          doStart();
        } else {
          if (resp.statusCode === 500) {
            if (doStartCalled === false) {
            // doStart hasn't been called yet, this 500 has returned before 10s,
            // so it's not due to a timeout
              msgs.error(couldNotOpenJobErrorMessage, resp);
            }
          } else {
            // console.log(resp);
            msgs.error(couldNotOpenJobErrorMessage, resp);
          }
          $scope.saveLock = false;
        }
      });

    // start the datafeed
    function doStart() {
      if (doStartCalled === false) {
        doStartCalled = true;
        mlJobService.startDatafeed($scope.datafeedId, $scope.jobId, $scope.start, $scope.end)
          .then(() => {
            $rootScope.$broadcast('jobsUpdated');

            if ($scope.ui.createWatch) {
              $rootScope.$broadcast('openCreateWatchWindow', job);
            }
          })
          .catch(() => {
            $scope.saveLock = false;
          });
      }
    }

    $modalInstance.close();
    window.setTimeout(() => {
      $rootScope.$broadcast('jobsUpdated');
    }, 500);
  };

  $scope.cancel = function () {
    $modalInstance.close();
  };
});
