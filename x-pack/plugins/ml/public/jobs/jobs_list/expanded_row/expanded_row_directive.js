/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import moment from 'moment';
import { toLocaleString, detectorToString } from 'plugins/ml/util/string_utils';
import { JOB_STATE, DATAFEED_STATE } from 'plugins/ml/../common/constants/states';
import { ML_DATA_PREVIEW_COUNT } from 'plugins/ml/../common/util/job_utils';
import { permissionCheckProvider } from 'plugins/ml/privilege/check_privilege';
import numeral from '@elastic/numeral';
import chrome from 'ui/chrome';
import angular from 'angular';
import template from './expanded_row.html';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('mlJobListExpandedRow', function ($location, mlMessageBarService, mlJobService, mlClipboardService, Private) {
  return {
    restrict: 'AE',
    replace: false,
    scope: {
      job: '=',
      calendars: '=',
      currentTab: '=',
      jobAudit: '=',
      closeJob: '=',
      canCloseJob: '=',
      validateJob: '='
    },
    template,
    link: function ($scope, $element) {
      const msgs = mlMessageBarService; // set a reference to the message bar service
      const TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
      const DATA_FORMAT = '0.0 b';

      $scope.urlBasePath = chrome.getBasePath();
      const { checkPermission } = Private(permissionCheckProvider);
      $scope.permissions = {
        canPreviewDatafeed: checkPermission('canPreviewDatafeed')
      };

      $scope.toLocaleString = toLocaleString; // add toLocaleString to the scope to display nicer numbers

      // scope population is inside a function so it can be called later from somewhere else
      $scope.init = function () {
        const tempJob = angular.copy($scope.job);
        delete tempJob.calendars;
        $scope.jobJson = angular.toJson(tempJob, true);
        $scope.jobAuditText = '';
        $scope.datafeedPreview = {
          update: updateDatafeedPreview,
          json: '',
        };

        $scope.detectorToString = detectorToString;
        $scope.JOB_STATE = JOB_STATE;
        $scope.DATAFEED_STATE = DATAFEED_STATE;

        $scope.ui = {
          currentTab: $scope.currentTab,
          tabs: [
            { index: 0, title: 'Job settings' },
            { index: 1, title: 'Job config' },
            { index: 3, title: 'Counts' },
            { index: 4, title: 'JSON' },
            { index: 5, title: 'Job messages', showIcon: true },
            { index: 6, title: 'Datafeed preview' },
            { index: 7, title: 'Forecasts' }
          ],
          changeTab: function (tab) {
            this.currentTab.index = tab.index;

            if (tab.index === 5) {
              // when Job Message tab is clicked, load all the job messages for the last month
              // use the promise chain returned from update to scroll to the bottom of the
              // list once it's loaded
              $scope.jobAudit.update()
                .then(() => {
                // auto scroll to the bottom of the message list.
                  const div = angular.element('#ml-job-audit-list-' + $scope.job.job_id);
                  if (div && div.length) {
                  // run this asynchronously in a timeout to allow angular time to render the contents first
                    window.setTimeout(() => {
                      const table = div.find('table');
                      if (table && table.length) {
                        div[0].scrollTop = table[0].offsetHeight - div[0].offsetHeight + 14;
                      }
                    }, 0);
                  }
                });
            } else if (tab.index === 6) {
              updateDatafeedPreview();
            }
          },
          closeJobDisabled() {
            if ($scope.canCloseJob === false) {
              return true;
            }
            else if ($scope.job.datafeed_config &&
              $scope.job.datafeed_config.state === DATAFEED_STATE.STOPPED &&
              $scope.job.state === JOB_STATE.OPENED) {
              return false;
            }
            else if (($scope.job.datafeed_config === undefined ||
              $scope.job.datafeed_config.datafeed_id === undefined) &&
              $scope.job.state === JOB_STATE.OPENED) {
              return false;
            }
            else if ($scope.job.state === JOB_STATE.FAILED) {
              return false;
            } else {
              return true;
            }
          },
          getCloseJobTooltip() {
            if ($scope.job.datafeed_config && $scope.job.datafeed_config.state === DATAFEED_STATE.STARTED) {
              return 'Datafeed must be stopped to close job';
            } else if ($scope.job.state === JOB_STATE.CLOSED) {
              return 'Job already closed';
            } else {
              return '';
            }
          }
        };

        if (typeof $scope.job.datafeed_config !== 'undefined') {
          $scope.ui.tabs.splice(2, 0, { index: 2, title: 'Datafeed' });
        }

        // replace localhost in any of the job's urls with the host in the browser's address bar
        if ($scope.job.location) {
          $scope.job.location = replaceHost($scope.job.location);
        }
        if ($scope.job.endpoints) {
          _.each($scope.job.endpoints, (url, i) => {
            $scope.job.endpoints[i] = replaceHost(url);
          });
        }

        // call changeTab on initialization.
        // as the current tab may not be 0, if the list has been redrawn.
        // calling changeTab causes the audit or datafeed preview to be triggered
        // and thus refreshes the content if the current tab is 5 or 6
        $scope.ui.changeTab($scope.ui.currentTab);
      };

      function updateDatafeedPreview() {
        $scope.datafeedPreview.json = '';
        if ($scope.permissions.canPreviewDatafeed) {
          mlJobService.getDatafeedPreview($scope.job.job_id)
            .then((resp) => {
              if (Array.isArray(resp)) {
                $scope.datafeedPreview.json = angular.toJson(resp.slice(0, ML_DATA_PREVIEW_COUNT), true);
              } else {
                msgs.error('Datafeed preview could not be loaded', resp);
              }
            })
            .catch((resp) => {
              msgs.error('Datafeed preview could not be loaded', resp);
            });
        }
      }

      // call function defined above.
      $scope.init();

      $scope.copyToClipboard = function (job) {
        const newJob = angular.copy(job);
        const success = mlClipboardService.copy(angular.toJson(newJob));
        if (success) {
          // flash the background color of the json box
          // to show the contents has been copied.
          const el = $element.find('.ml-pre');
          el.css('transition', 'none');
          el.css('background-color', 'aliceblue');
          el.css('color', 'white');
          window.setTimeout(() => {
            el.css('transition', 'background 0.3s linear, color 0.3s linear');
            el.css('background-color', 'white');
            el.css('color', 'inherit');
          }, 1);

        } else {
          msgs.error('Job could not be copied to the clipboard');
        }
      };

      // data values should be formatted with KB, MB etc
      $scope.formatData = function (txt) {
        return numeral(txt).format(DATA_FORMAT);
      };

      // milliseconds should be formatted h m s ms, e.g 3s 44ms
      $scope.formatMS = function (txt) {
        const dur = moment.duration(txt);
        let str = '';
        if (dur._data.days > 0) {
          str += ' ' + dur._data.days + 'd';
        }
        if (dur._data.hours > 0) {
          str += ' ' + dur._data.hours + 'h';
        }
        if (dur._data.minutes > 0) {
          str += ' ' + dur._data.minutes + 'm';
        }
        if (dur._data.seconds > 0) {
          str += ' ' + dur._data.seconds + 's';
        }
        if (dur._data.milliseconds > 0) {
          str += ' ' + Math.ceil(dur._data.milliseconds) + 'ms';
        }
        return str;
      };

      // date values should be formatted with TIME_FORMAT
      $scope.formatDate = function (txt) {
        return moment(txt).format(TIME_FORMAT);
      };

      $scope.getDuration = () => ({
        start: $scope.job.data_counts.earliest_record_timestamp,
        end: $scope.job.data_counts.latest_record_timestamp
      });
      $scope.getJobConfig = () => $scope.job;

      function replaceHost(url) {
        if (url.match('localhost')) {
          url = url.replace('localhost', $location.host());
        }
        return url;
      }

    },
  };
})
// custom filter to filter out objects but allow arrays in a collection
// used when listing job settings, as id and state are siblings to objects like counts and data_description
  .filter('filterObjects', function () {
    return function (input, allowArrays = false) {
      const tempObj = {};
      _.each(input, (v, i) => {
        const isObj = typeof v === 'object';
        if (isObj === false || (allowArrays && isObj && Array.isArray(v))) {
          tempObj[i] = v;
        }
      });
      return tempObj;
    };
  });
