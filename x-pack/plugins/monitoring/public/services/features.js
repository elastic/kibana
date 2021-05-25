/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { has, isUndefined } from 'lodash';

export function featuresProvider($window) {
  function getData() {
    let returnData = {};
    const monitoringData = $window.localStorage.getItem('xpack.monitoring.data');

    try {
      returnData = (monitoringData && JSON.parse(monitoringData)) || {};
    } catch (e) {
      console.error('Monitoring UI: error parsing locally stored monitoring data', e);
    }

    return returnData;
  }

  function update(featureName, value) {
    const monitoringDataObj = getData();
    monitoringDataObj[featureName] = value;
    $window.localStorage.setItem('xpack.monitoring.data', JSON.stringify(monitoringDataObj));
  }

  function isEnabled(featureName, defaultSetting) {
    const monitoringDataObj = getData();
    if (has(monitoringDataObj, featureName)) {
      return monitoringDataObj[featureName];
    }

    if (isUndefined(defaultSetting)) {
      return false;
    }

    return defaultSetting;
  }

  return {
    isEnabled,
    update,
  };
}
