/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import template from './influencers_selection.html';

import _ from 'lodash';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('mlInfluencersSelection', function () {
  return {
    restrict: 'E',
    replace: true,
    template,
    controller: function ($scope) {

      // is the field passed in being used as a split field or the over field?
      // called from html. default fields can't be removed from the influencer list
      $scope.isDefaultInfluencer = function (field) {
        const defaultFields = getDefaultFields();
        return (defaultFields.find(f => f.name === field.name) !== undefined);
      };

      $scope.toggleInfluencerChange = function () {
        $scope.addDefaultFieldsToInfluencerList();
      };

      // force add the over field and split fields to the front of the influencer list.
      // as we have no control over the ui-select remove "x" link on each pill, if
      // the user removes a split field, this function will put it back in again.
      $scope.addDefaultFieldsToInfluencerList = function () {
        const defaultFields = getDefaultFields();
        const nonDefaultFields = getNonDefaultFields(defaultFields);
        $scope.formConfig.influencerFields = defaultFields.concat(nonDefaultFields);
      };

      // get a list of the default fields made up of the over field and the split fields
      function getDefaultFields() {
        const defaultFields = getSplitFields();
        if ($scope.formConfig.hasOwnProperty('overField') === true) {
          // only available for population jobs
          // don't add duplicate influencers, check to see if the over field is already a default field
          if (defaultFields.find((f) => f.name === $scope.formConfig.overField.name) === undefined) {
            defaultFields.push($scope.formConfig.overField);
          }
        }
        return defaultFields;
      }

      function getNonDefaultFields(defaultFields) {
        return $scope.formConfig.influencerFields.filter(f => {
          return (defaultFields.find(sp => sp === f) === undefined);
        });
      }

      // get the split fields from either each selected field (for population jobs)
      // or from the global split field (multi-metric jobs)
      function getSplitFields() {
        if ($scope.formConfig.hasOwnProperty('splitField') === false) {
          let splitFields = $scope.formConfig.fields
            .map(f => f.splitField)
            // remove undefined fields
            .filter(f => (f !== undefined && f !== ''));
          // deduplicate
          splitFields = _.uniq(splitFields, 'name');
          return splitFields;
        } else {
          if ($scope.formConfig.splitField === undefined) {
            return [];
          } else {
            return [$scope.formConfig.splitField];
          }
        }
      }
    }
  };
});
