/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import angular from 'angular';
import { detectorToString } from 'plugins/ml/util/string_utils';
import { mlMessageBarService } from 'plugins/ml/components/messagebar/messagebar_service';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.controller('MlDetectorModal', function ($scope, $modalInstance, params) {
  const msgs = mlMessageBarService;
  msgs.clear();
  $scope.title = i18n.translate('xpack.ml.newJob.advanced.detectorModal.addNewDetectorTitle', {
    defaultMessage: 'Add new detector'
  });
  $scope.detector = { 'function': '' };
  $scope.saveLock = false;
  $scope.editMode = false;
  let index = -1;

  $scope.updateButtonLabel = i18n.translate('xpack.ml.newJob.advanced.detectorModal.updateButtonLabel', {
    defaultMessage: 'Update'
  });
  $scope.addButtonLabel = i18n.translate('xpack.ml.newJob.advanced.detectorModal.addButtonLabel', {
    defaultMessage: 'Add'
  });

  $scope.functions = [
    { id: 'count',                 uri: 'ml-count-functions.html#ml-count' },
    { id: 'low_count',             uri: 'ml-count-functions.html#ml-count' },
    { id: 'high_count',            uri: 'ml-count-functions.html#ml-count' },
    { id: 'non_zero_count',        uri: 'ml-count-functions.html#ml-nonzero-count' },
    { id: 'low_non_zero_count',    uri: 'ml-count-functions.html#ml-nonzero-count' },
    { id: 'high_non_zero_count',   uri: 'ml-count-functions.html#ml-nonzero-count' },
    { id: 'distinct_count',        uri: 'ml-count-functions.html#ml-distinct-count' },
    { id: 'low_distinct_count',    uri: 'ml-count-functions.html#ml-distinct-count' },
    { id: 'high_distinct_count',   uri: 'ml-count-functions.html#ml-distinct-count' },
    { id: 'rare',                  uri: 'ml-rare-functions.html#ml-rare' },
    { id: 'freq_rare',             uri: 'ml-rare-functions.html#ml-freq-rare' },
    { id: 'info_content',          uri: 'ml-info-functions.html#ml-info-content' },
    { id: 'low_info_content',      uri: 'ml-info-functions.html#ml-info-content' },
    { id: 'high_info_content',     uri: 'ml-info-functions.html#ml-info-content' },
    { id: 'metric',                uri: 'ml-metric-functions.html#ml-metric-metric' },
    { id: 'median',                uri: 'ml-metric-functions.html#ml-metric-median' },
    { id: 'low_median',            uri: 'ml-metric-functions.html#ml-metric-median' },
    { id: 'high_median',           uri: 'ml-metric-functions.html#ml-metric-median' },
    { id: 'mean',                  uri: 'ml-metric-functions.html#ml-metric-mean' },
    { id: 'low_mean',              uri: 'ml-metric-functions.html#ml-metric-mean' },
    { id: 'high_mean',             uri: 'ml-metric-functions.html#ml-metric-mean' },
    { id: 'min',                   uri: 'ml-metric-functions.html#ml-metric-min' },
    { id: 'max',                   uri: 'ml-metric-functions.html#ml-metric-max' },
    { id: 'varp',                  uri: 'ml-metric-functions.html#ml-metric-varp' },
    { id: 'low_varp',              uri: 'ml-metric-functions.html#ml-metric-varp' },
    { id: 'high_varp',             uri: 'ml-metric-functions.html#ml-metric-varp' },
    { id: 'sum',                   uri: 'ml-sum-functions.html#ml-sum' },
    { id: 'low_sum',               uri: 'ml-sum-functions.html#ml-sum' },
    { id: 'high_sum',              uri: 'ml-sum-functions.html#ml-sum' },
    { id: 'non_null_sum',          uri: 'ml-sum-functions.html#ml-nonnull-sum' },
    { id: 'low_non_null_sum',      uri: 'ml-sum-functions.html#ml-nonnull-sum' },
    { id: 'high_non_null_sum',     uri: 'ml-sum-functions.html#ml-nonnull-sum' },
    { id: 'time_of_day',           uri: 'ml-time-functions.html#ml-time-of-day' },
    { id: 'time_of_week',          uri: 'ml-time-functions.html#ml-time-of-week' },
    { id: 'lat_long',              uri: 'ml-geo-functions.html#ml-lat-long' },
  ];

  $scope.functionIds = {};
  _.each($scope.functions, (f) => {
    $scope.functionIds[f.id] = '';
  });

  $scope.fields = params.fields;

  // fields list for by_field_name field only
  $scope.fields_byFieldName = angular.copy($scope.fields);
  // if data has been added to the categorizationFieldName,
  // add the option mlcategory to the by_field_name datalist
  if (params.catFieldNameSelected) {
    $scope.fields_byFieldName.mlcategory = 'mlcategory';
  }

  const validate = params.validate;
  const add = params.add;
  if (params.detector) {
    $scope.detector = params.detector;
    index = params.index;
    $scope.title = i18n.translate('xpack.ml.newJob.advanced.detectorModal.editDetectorTitle', {
      defaultMessage: 'Edit detector'
    });
    $scope.editMode = true;
  }

  $scope.detectorToString = detectorToString;

  $scope.helpLink = {};

  $scope.functionChange = function () {
    const func = _.findWhere($scope.functions, { id: $scope.detector.function });
    $scope.helpLink.label = i18n.translate('xpack.ml.newJob.advanced.detectorModal.helpForAnalyticalFunctionsLabel', {
      defaultMessage: 'Help for analytical functions'
    });
    $scope.helpLink.uri = 'ml-functions.html';

    if (func) {
      $scope.helpLink.uri = func.uri;
      $scope.helpLink.label = i18n.translate('xpack.ml.newJob.advanced.detectorModal.helpForAnalyticalFunctionLabel', {
        defaultMessage: 'Help for {funcId}',
        values: { funcId: func.id }
      });
    }
  };

  $scope.functionChange();

  $scope.setDetectorProperty = function (value, field) {
    if (value === '' || value === undefined) {
      // remove the property from the detector JSON
      delete $scope.detector[field];
    } else {
      $scope.detector[field] = value;
    }

    if (field === 'function') {
      $scope.functionChange();
    }
  };

  $scope.save = function () {
    $scope.saveLock = true;
    validate($scope.detector)
      .then((resp) => {
        $scope.saveLock = false;
        if (resp.success) {
          if ($scope.detector.detector_description === '') {
            // remove blank description so server generated one is used.
            delete $scope.detector.detector_description;
          }
          add($scope.detector, index);
          $modalInstance.close($scope.detector);
          msgs.clear();

        } else {
          msgs.error(resp.message);
        }
      });
  };

  $scope.cancel = function () {
    msgs.clear();
    $modalInstance.close();
  };
});
