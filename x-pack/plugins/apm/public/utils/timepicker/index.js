/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import chrome from 'ui/chrome';
import 'ui/autoload/all';
import { updateTimePicker } from '../../store/urlParams';
import { timefilter, registerTimefilterWithGlobalState } from 'ui/timefilter';

let currentInterval;

// hack to wait for angular template to be ready
const waitForAngularReady = new Promise(resolve => {
  const checkInterval = setInterval(() => {
    const hasElm = !!document.querySelector('#kibana-angular-template');
    if (hasElm) {
      clearInterval(checkInterval);
      resolve();
    }
  }, 10);
});

export function initTimepicker(history, dispatch) {
  return new Promise(resolve => {
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
      .get('app/apm', [])
      .controller(
        'TimePickerController',
        ($scope, globalState, $rootScope, i18n) => {
          // Add APM feedback menu
          // TODO: move this somewhere else
          $scope.topNavMenu = [];
          $scope.topNavMenu.push({
            key: 'APM feedback',
            label: i18n('xpack.apm.topNav.apmFeedbackLabel', {
              defaultMessage: 'APM feedback'
            }),
            description: i18n('xpack.apm.topNav.apmFeedbackDescription', {
              defaultMessage: 'APM feedback'
            }),
            tooltip: i18n('xpack.apm.topNav.apmFeedbackTooltip', {
              defaultMessage: 'Provide feedback on APM'
            }),
            template: require('../../templates/feedback_menu.html')
          });

          history.listen(() => {
            updateRefreshRate(dispatch);
            globalState.fetch(); // ensure global state is updated when url changes
          });

          // ensure that redux is notified after timefilter has updated
          $scope.$listen(timefilter, 'timeUpdate', () =>
            dispatch(updateTimePickerAction())
          );

          // ensure that timepicker updates when global state changes
          registerTimefilterWithGlobalState(globalState, $rootScope);

          timefilter.enableTimeRangeSelector();
          timefilter.enableAutoRefreshSelector();

          dispatch(updateTimePickerAction());
          updateRefreshRate(dispatch);

          Promise.all([waitForAngularReady]).then(resolve);
        }
      );
  });
}

function updateTimePickerAction() {
  return updateTimePicker({
    min: timefilter.getBounds().min.toISOString(),
    max: timefilter.getBounds().max.toISOString()
  });
}

function updateRefreshRate(dispatch) {
  const refreshInterval = timefilter.getRefreshInterval().value;
  if (currentInterval) {
    clearInterval(currentInterval);
  }

  if (refreshInterval > 0 && !timefilter.getRefreshInterval().pause) {
    currentInterval = setInterval(
      () => dispatch(updateTimePickerAction()),
      refreshInterval
    );
  }
}
