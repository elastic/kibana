/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import {
  uiModules
} from 'ui/modules';
import chrome from 'ui/chrome';
import 'ui/autoload/all';
import {
  timefilter
} from 'ui/timefilter';


// hack to wait for angular template to be ready
const waitForAngularReady = new Promise(resolve => {
  const checkInterval = setInterval(() => {
    const hasElm = !!document.querySelector('#gis-top-nav');
    if (hasElm) {
      clearInterval(checkInterval);
      resolve();
    }
  }, 10);
});

export function initTimepicker(resolve) {
  // default the timepicker to the last 24 hours
  chrome.getUiSettingsClient().overrideLocalDefault(
    'timepicker:timeDefaults',
    JSON.stringify({
      from: 'now-24h',
      to: 'now',
      mode: 'quick'
    })
  );

  uiModules
    .get('app/gis', [])
    .controller('TimePickerController', ($scope) => {
      // Add APM feedback menu
      // TODO: move this somewhere else
      $scope.topNavMenu = [];
      timefilter.setTime = (from, to) => {
        timefilter.getTime().from = moment(from).toISOString();
        timefilter.getTime().to = moment(to).toISOString();
        $scope.$apply();
      };
      timefilter.enableTimeRangeSelector();
      timefilter.enableAutoRefreshSelector();

      // TODO: Update redux with timepicker values

      Promise.all([waitForAngularReady]).then(resolve());
    });
}

export default (timefilter) => ranges => {
  timefilter.setTime({
    from: moment(ranges.xaxis.from).toISOString(),
    to: moment(ranges.xaxis.to).toISOString(),
    mode: 'absolute',
  });
};

