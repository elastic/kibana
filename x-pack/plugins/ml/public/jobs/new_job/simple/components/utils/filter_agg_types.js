/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import _ from 'lodash';
import angular from 'angular';
import { i18n } from '@kbn/i18n';

export function filterAggTypes(aggTypes) {
  const filteredAggTypes = [];
  let typeCopy;
  _.each(aggTypes, (type) => {
    type.mlName = type.name;
    type.mlModelPlotAgg = { max: type.name, min: type.name };
    type.isCountType = false;
    type.isAggregatableStringType = false;

    _.each(type.params, (p) => {
      if (p.filterFieldTypes && typeof p.filterFieldTypes === 'string') {
        p.filterFieldTypes = p.filterFieldTypes.replace(',date', '');
      }
    });

    if (type.name === 'count') {
      type.mlModelPlotAgg = { max: 'max', min: 'min' };
      type.isCountType = true;
      filteredAggTypes.push(type);

      typeCopy = angular.copy(type);
      typeCopy.title = i18n.translate('xpack.ml.newJob.simple.filterAggTypes.highCountLabel', {
        defaultMessage: 'High count'
      });
      typeCopy.mlName = 'high_count';
      filteredAggTypes.push(typeCopy);

      typeCopy = angular.copy(type);
      typeCopy.title = i18n.translate('xpack.ml.newJob.simple.filterAggTypes.lowCountLabel', {
        defaultMessage: 'Low count'
      });
      typeCopy.mlName = 'low_count';
      filteredAggTypes.push(typeCopy);

    } else if (type.name === 'sum') {
      filteredAggTypes.push(type);

      typeCopy = angular.copy(type);
      typeCopy.title = i18n.translate('xpack.ml.newJob.simple.filterAggTypes.highSumLabel', {
        defaultMessage: 'High sum'
      });
      typeCopy.mlName = 'high_sum';
      filteredAggTypes.push(typeCopy);

      typeCopy = angular.copy(type);
      typeCopy.title = i18n.translate('xpack.ml.newJob.simple.filterAggTypes.lowSumLabel', {
        defaultMessage: 'Low sum'
      });
      typeCopy.mlName = 'low_sum';
      filteredAggTypes.push(typeCopy);

    } else if (type.name === 'avg') {
      type.title = i18n.translate('xpack.ml.newJob.simple.filterAggTypes.meanLabel', {
        defaultMessage: 'Mean'
      });
      type.mlName = 'mean';
      filteredAggTypes.push(type);

      typeCopy = angular.copy(type);
      typeCopy.title = i18n.translate('xpack.ml.newJob.simple.filterAggTypes.highMeanLabel', {
        defaultMessage: 'High mean'
      });
      typeCopy.mlName = 'high_mean';
      filteredAggTypes.push(typeCopy);

      typeCopy = angular.copy(type);
      typeCopy.title = i18n.translate('xpack.ml.newJob.simple.filterAggTypes.lowMeanLabel', {
        defaultMessage: 'Low mean'
      });
      typeCopy.mlName = 'low_mean';
      filteredAggTypes.push(typeCopy);

    } else if (type.name === 'median') {
      type.mlModelPlotAgg = { max: 'max', min: 'min' };
      filteredAggTypes.push(type);

      typeCopy = angular.copy(type);
      typeCopy.title = i18n.translate('xpack.ml.newJob.simple.filterAggTypes.highMedianLabel', {
        defaultMessage: 'High median'
      });
      typeCopy.mlName = 'high_median';
      filteredAggTypes.push(typeCopy);

      typeCopy = angular.copy(type);
      typeCopy.title = i18n.translate('xpack.ml.newJob.simple.filterAggTypes.lowMedianLabel', {
        defaultMessage: 'Low median'
      });
      typeCopy.mlName = 'low_median';
      filteredAggTypes.push(typeCopy);


    } else if (type.name === 'min') {
      filteredAggTypes.push(type);
    } else if (type.name === 'max') {
      filteredAggTypes.push(type);
    } else if (type.name === 'cardinality') {
      type.title = i18n.translate('xpack.ml.newJob.simple.filterAggTypes.distinctCountLabel', {
        defaultMessage: 'Distinct count'
      });
      type.mlName = 'distinct_count';
      type.mlModelPlotAgg = { max: 'max', min: 'min' };
      type.isAggregatableStringType = true;

      _.each(type.params, (p) => {
        if (p.filterFieldTypes) {
          p.filterFieldTypes = 'number,boolean,ip,string';
        }
      });

      filteredAggTypes.push(type);
    }
  });
  return filteredAggTypes;
}
