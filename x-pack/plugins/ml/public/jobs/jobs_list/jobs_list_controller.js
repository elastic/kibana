/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import _ from 'lodash';
import $ from 'jquery';
import moment from 'moment';
import angular from 'angular';

import 'plugins/ml/components/form_filter_input';
import jobsListControlsHtml from './jobs_list_controls.html';
import jobsListArrow from 'plugins/ml/components/paginated_table/open.html';
import { isTimeSeriesViewJob } from 'plugins/ml/../common/util/job_utils';
import { toLocaleString, mlEscape } from 'plugins/ml/util/string_utils';

import uiRoutes from 'ui/routes';
import { checkLicense } from 'plugins/ml/license/check_license';
import { checkGetJobsPrivilege, permissionCheckProvider } from 'plugins/ml/privilege/check_privilege';
import { addItemToRecentlyAccessed } from 'plugins/ml/util/recently_accessed';
import { getMlNodeCount, mlNodesAvailable, permissionToViewMlNodeCount } from 'plugins/ml/ml_nodes_check/check_ml_nodes';


import template from './jobs_list.html';
import deleteJobTemplate from 'plugins/ml/jobs/jobs_list/delete_job_modal/delete_job_modal.html';
import editJobTemplate from 'plugins/ml/jobs/jobs_list/edit_job_modal/edit_job_modal.html';
import createWatchTemplate from 'plugins/ml/jobs/jobs_list/create_watch_modal/create_watch_modal.html';
import { buttonsEnabledChecks } from 'plugins/ml/jobs/jobs_list/buttons_enabled_checks';
import { cloudServiceProvider } from 'plugins/ml/services/cloud_service';
import { loadNewJobDefaults } from 'plugins/ml/jobs/new_job/utils/new_job_defaults';

uiRoutes
  .when('/jobs/?', {
    template,
    resolve: {
      CheckLicense: checkLicense,
      privileges: checkGetJobsPrivilege,
      mlNodeCount: getMlNodeCount,
      loadNewJobDefaults
    }
  });

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml', ['ui.bootstrap']);

module.controller('MlJobsList',
  function (
    $scope,
    $route,
    $location,
    $window,
    $timeout,
    $compile,
    $modal,
    es,
    timefilter,
    kbnUrl,
    Private,
    mlMessageBarService,
    mlClipboardService,
    mlJobService,
    mlCalendarService,
    mlDatafeedService,
    mlNotificationService) {

    timefilter.disableTimeRangeSelector(); // remove time picker from top of page
    timefilter.disableAutoRefreshSelector(); // remove time picker from top of page
    const rowScopes = []; // track row scopes, so they can be destroyed as needed
    const msgs = mlMessageBarService; // set a reference to the message bar service
    const TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
    let refreshCounter = 0;
    let refreshJobsTimeout = null;
    const auditMessages = {};
    $scope.noJobsCreated;
    $scope.toLocaleString = toLocaleString; // add toLocaleString to the scope to display nicer numbers
    $scope.filterText = '';
    $scope.filterIcon = 0;
    let filterRegexp;
    let jobFilterTimeout;

    $scope.kbnUrl = kbnUrl;
    $scope.mlNodesAvailable = mlNodesAvailable();
    $scope.permissionToViewMlNodeCount = permissionToViewMlNodeCount();

    const { isRunningOnCloud, getCloudId } = Private(cloudServiceProvider);
    $scope.isCloud = isRunningOnCloud();
    $scope.cloudId = getCloudId();

    const { checkPermission, createPermissionFailureMessage } = Private(permissionCheckProvider);
    $scope.createPermissionFailureMessage = createPermissionFailureMessage;
    $scope.permissions = {
      canCreateJob: checkPermission('canCreateJob'),
      canUpdateJob: checkPermission('canUpdateJob'),
      canDeleteJob: checkPermission('canDeleteJob'),
      canCloseJob: checkPermission('canCloseJob'),
      canUpdateDatafeed: checkPermission('canUpdateDatafeed'),
      canStartStopDatafeed: checkPermission('canStartStopDatafeed'),
    };

    $scope.jobStats = mlJobService.jobStats;

    // functions for job list buttons
    // called from jobs_list_controls.html
    $scope.deleteJob = function (job) {
      const status = { deleteLock: false, deleteDatafeed: 0, deleteJob: 0, errorMessage: '' };

      $modal.open({
        template: deleteJobTemplate,
        controller: 'MlDeleteJobModal',
        backdrop: 'static',
        keyboard: false,
        size: 'sm',
        resolve: {
          params: function () {
            return {
              doDelete: doDelete,
              status: status,
              jobId: job.job_id,
              isDatafeed: (job.datafeed_config && Object.keys(job.datafeed_config).length) ? true : false
            };
          }
        }
      });

      function doDelete() {
        status.deleteLock = true;
        mlJobService.deleteJob(job, status)
          .then((deleteResp) => {
            if (deleteResp.success) {
              status.deleteLock = false;
              msgs.clear();
              msgs.info('Job \'' + job.job_id + '\' deleted');
              status.deleteLock = false;
              refreshJobs();
            }
          });
      }
    };

    $scope.newJob = function () {
      $location.path('jobs/new_job');
    };

    $scope.editJob = function (job) {
      openEditJobWindow(job);
    };

    $scope.cloneJob = function (job) {
      mlJobService.currentJob = job;
      $location.path('jobs/new_job/advanced');
    };

    $scope.closeJob = function (job) {
      let closeFunc = mlJobService.closeJob;
      if (job.state === 'failed') {
        closeFunc = mlJobService.forceCloseJob;
      }

      closeFunc(job.job_id)
        .then(() => {
          $scope.refreshJob(job.job_id);
        })
        .catch(resp => {
          msgs.error('Job could not be closed', resp);
          refreshJobs();
        });
    };

    $scope.copyToClipboard = function (job) {
      const success = mlClipboardService.copy(angular.toJson(job));
      if (success) {
        msgs.clear();
        msgs.info(job.job_id + ' JSON copied to clipboard');
      } else {
        msgs.error('Job could not be copied to the clipboard');
      }
    };

    $scope.startDatafeed = function (job) {
      mlDatafeedService.openJobTimepickerWindow(job, $scope);
    };

    $scope.stopDatafeed = function (job) {
    // setting the state to 'stopping' disables the stop button
      if (job.datafeed_config) {
        job.datafeed_config.state = 'stopping';
      }

      const datafeedId = mlJobService.getDatafeedId(job.job_id);
      mlJobService.stopDatafeed(datafeedId, job.job_id).then(() => {
        $scope.refreshJob(job.job_id);
      });
    };

    // function for displaying the time for a job based on latest_record_timestamp
    // added to rowScope so it can be updated live when data changes
    function latestTimeStamp(dataCounts) {
      const obj = { string: '', unix: 0 };
      if (dataCounts.latest_record_timestamp) {
        const ts = moment(dataCounts.latest_record_timestamp);
        obj.string = ts.format(TIME_FORMAT);
        obj.unix = ts;
      }
      return obj;
    }

    // function for displaying jobs list
    // anytime the jobs list is reloaded, the display will be freshed.
    function displayJobs(jobs) {
    // keep track of whether the row has already been expanded
    // if this table is has been refreshed, it is helpful to reopen
    // any rows the user had open.
      const rowStates = {};
      _.each(rowScopes, (rs) => {
        rowStates[rs.job.job_id] = {
          open: rs.open,
          $expandElement: rs.$expandElement,
          currentTab: rs.currentTab
        };
      });

      _.invoke(rowScopes, '$destroy');
      rowScopes.length = 0;
      $scope.jobs = jobs;

      // Create table
      $scope.table = {};
      $scope.table.perPage = 10;
      $scope.table.columns = [
        { title: '', sortable: false, class: 'col-expand-arrow' },
        { title: 'Job ID' },
        { title: '', sortable: false, class: 'col-info' },
        { title: 'Description' },
        { title: 'Processed records', class: 'col-align-right' },
        { title: 'Memory status' },
        { title: 'Job state' },
        { title: 'Datafeed state' },
        { title: 'Latest timestamp' },
        { title: 'Actions', sortable: false, class: 'col-action' }
      ];

      const jobCalendars = mlCalendarService.jobCalendars;

      let rows = jobs.map((job) => {
        const rowScope = $scope.$new();
        const calendars = jobCalendars[job.job_id];
        if (calendars && calendars.length) {
          rowScope.calendars = calendars;
        }
        rowScope.job = job;
        rowScope.closeJob = $scope.closeJob;
        rowScope.canCloseJob = ($scope.permissions.canCloseJob && $scope.mlNodesAvailable);
        rowScope.currentTab = { index: 0 };
        rowScope.jobAudit = {
          messages: '',
          update: () => loadAuditMessages(jobs, [rowScope], rowScope.job.job_id),
          jobWarningClass: '',
          jobWarningText: ''
        };

        rowScope.expandable = true;
        rowScope.expandElement = 'ml-job-list-expanded-row-container';
        rowScope.initRow = function () {
          // function called when row is opened for the first time
          if (rowScope.$expandElement &&
           rowScope.$expandElement.children().length === 0) {
            const $el = $('<ml-job-list-expanded-row>', {
              'job': 'job',
              'calendars': 'calendars',
              'current-tab': 'currentTab',
              'job-audit': 'jobAudit',
              'close-job': 'closeJob',
              'can-close-job': 'canCloseJob',
            });
            $el.appendTo(this.$expandElement);
            $compile($el)(this);
          }
        };

        rowScope.time = latestTimeStamp;
        rowScope.jobUrl = mlJobService.jobUrls[job.job_id];
        rowScope.enableTimeSeries = isTimeSeriesViewJob(job);
        rowScope.addItemToRecentlyAccessed = addItemToRecentlyAccessed;

        rowScope.checks = buttonsEnabledChecks($scope.permissions, job, createPermissionFailureMessage, $scope.mlNodesAvailable);

        rowScopes.push(rowScope);
        const jobDescription = job.description || '';
        // col array
        if ($scope.filterText === undefined ||
          $scope.filterText === '' ||
          job.job_id.match(filterRegexp) ||
          jobDescription.match(filterRegexp)) {

        // long string moved to separate variable to allow it to be broken in two
          let iconTxt = '<i ng-show="tab.jobWarningClass !== \'\'" ';
          iconTxt += 'tooltip="{{jobAudit.jobWarningText}}" class="{{jobAudit.jobWarningClass}}"></i>';

          const tableRow = [{
            markup: jobsListArrow,
            scope: rowScope
          }, {
            markup: filterHighlight(job.job_id),
            value: job.job_id
          }, {
            markup: iconTxt,
            scope: rowScope
          }, {
            markup: filterHighlight(mlEscape(jobDescription)),
            value: jobDescription
          }, {
            markup: '<div class="col-align-right">{{toLocaleString(job.data_counts.processed_record_count)}}</div>',
            value: job.data_counts.processed_record_count,
            scope: rowScope
          }, {
            markup: '{{job.model_size_stats.memory_status}}',
            value: (() => { return (job.model_size_stats) ? job.model_size_stats.memory_status : ''; }),
            scope: rowScope
          }, {
            markup: '{{job.state}}',
            value: job.state,
            scope: rowScope
          }, {
            markup: '{{job.datafeed_config.state}}',
            value: (() => { return (job.datafeed_config.state) ? job.datafeed_config.state : ''; }),
            scope: rowScope
          }, {
            markup: '{{ time(job.data_counts).string }}',
            // use a function which returns the value as the time stamp value can change
            // but still needs be run though the time function to format it to unix time stamp
            value: (() => { return rowScope.time(job.data_counts).unix; }),
            scope: rowScope
          }, {
            markup: jobsListControlsHtml,
            scope: rowScope
          }];

          return tableRow;
        }
      });

      // filter out the rows that are undefined because they didn't match
      // the filter in the previous map
      rows = _.filter(rows, (row) => {
        if (row !== undefined) {
          return row;
        }
      });
      $scope.table.rows = rows;

      loadAuditSummary(jobs, rowScopes);

      // reapply the open flag for all rows.
      _.each(rowScopes, (rs) => {
        if (rowStates[rs.job.job_id]) {
          rs.open = rowStates[rs.job.job_id].open;
          rs.$expandElement = rowStates[rs.job.job_id].$expandElement;
          rs.currentTab = rowStates[rs.job.job_id].currentTab;
        }
      });

      clearTimeout(refreshJobsTimeout);
      refreshCounts();

      // clear the filter spinner if it's running
      $scope.filterIcon = 0;
    }

    // start a recursive timeout check to check the states
    function refreshCounts() {
      const timeout = 5000; // 5 seconds

      function refresh() {
        mlJobService.updateAllJobStats()
          .then((resp) => {
            // if jobs have been added or removed, redraw the whole list
            if (resp.listChanged) {
              jobsUpdated(resp.jobs);
            }
          });
      }

      refreshJobsTimeout = setTimeout(() => {
      // every 5th time, reload the counts and states of all the jobs
        if (refreshCounter % 5 === 0) {
          refresh();
          loadAuditSummary($scope.jobs, rowScopes);
        } else {
        // check to see if any jobs are 'running' if so, reload all the job counts
          const runningJobs = mlJobService.getRunningJobs();
          if (runningJobs.length) {
            refresh();
          }
        }

        // clear timeout to stop duplication
        clearTimeout(refreshJobsTimeout);

        // keep track of number if times the check has been performed
        refreshCounter++;

        // reset the timeout only if we're still on the jobs list page
        if ($location.$$path === '/jobs') {
          refreshCounts();
        }
      }, timeout);
    }

    // load and create audit log for the current job
    // log also includes system messages

    function loadAuditMessages(jobs, rowScopesIn, jobId) {
      const createTimes = {};
      const fromRange = '1M';
      const aDayAgo = moment().subtract(1, 'days');

      _.each(jobs, (job) => {
        if (auditMessages[job.job_id] === undefined) {
          auditMessages[job.job_id] = [];
        }
        // keep track of the job create times
        // only messages newer than the job's create time should be displayed.
        createTimes[job.job_id] = moment(job.create_time).valueOf();
      });

      // function for adding messages to job
      // deduplicated based on time and message
      function addMessage(id, msg) {
        if (auditMessages[id] !== undefined &&
         msg.timeMs >= createTimes[id]) {
          if (!_.findWhere(auditMessages[id], { timeMs: msg.timeMs, message: msg.message, node_name: msg.node_name })) {
            auditMessages[id].push(msg);
          }
        }
      }

      return mlNotificationService.getJobAuditMessages(fromRange, jobId)
        .then((resp) => {
          const messages = resp.messages;
          _.each(messages, (msg) => {
            const time = moment(msg.timestamp);
            msg.time = time.format(TIME_FORMAT);
            msg.timeMs = time.valueOf();
            msg.isRecent = (time > aDayAgo);

            if (msg.job_id === '') {
            // system message
              msg.level = 'system_info';
              addMessage(jobId, msg);
            } else {
            // job specific message
              addMessage(msg.job_id, msg);
            }
          });

          // if we've loaded messages for just one job, they may be out of order
          // so sorting is needed.
          auditMessages[jobId] = _.sortBy(auditMessages[jobId], 'timeMs');

          _.each(rowScopesIn, (rs) => {
            if (rs.job.job_id === jobId) {
              rs.jobAudit.messages = auditMessages[jobId];
            }
          });

        })
        .catch((resp) => {
          console.log('loadAuditMessages: audit messages for ' + jobId + ' could not be loaded');
          if (resp.message) {
            msgs.error(resp.message);
          }
        });
    }


    // function for loading audit messages for all jobs for displaying icons

    function loadAuditSummary(jobs, rowScopesIn) {
      const levels = { system_info: -1, info: 0, warning: 1, error: 2 };
      const jobMessages = {};
      const createTimes = {};

      _.each(jobs, (job) => {
      // keep track of the job create times
      // only messages newer than the job's create time should be displayed.
        createTimes[job.job_id] = moment(job.create_time).valueOf();
      });

      mlNotificationService.getAuditMessagesSummary()
        .then((resp) => {
          const messagesPerJob = resp.messagesPerJob;
          _.each(messagesPerJob, (job) => {
            // ignore system messages (id==='')
            if (job.key !== '') {
              if (job.levels && job.levels.buckets && job.levels.buckets.length) {
                let highestLevel = 0;
                let highestLevelText = '';
                let msgTime = 0;

                _.each(job.levels.buckets, (level) => {
                  const label = level.key;
                  // note the highest message level
                  if (levels[label] > highestLevel) {
                    highestLevel = levels[label];
                    if (level.latestMessage && level.latestMessage.buckets && level.latestMessage.buckets.length) {
                      _.each(level.latestMessage.buckets, (msg) => {
                        // there should only be one result here.
                        highestLevelText = msg.key;

                        // note the time in ms for the highest level
                        // so we can filter them out later if they're earlier than the
                        // job's create time.
                        if (msg.latestMessage && msg.latestMessage.value_as_string) {
                          const time = moment(msg.latestMessage.value_as_string);
                          msgTime = time.valueOf();
                        }

                      });
                    }
                  }
                });

                jobMessages[job.key] = {
                  job_id: job.key,
                  highestLevelText,
                  highestLevel,
                  msgTime
                };
              }
            }
          });

          // loop over the rowScopesIn and add icons if applicable
          _.each(rowScopesIn, (rs) => {
            const job = jobMessages[rs.job.job_id];
            if (job && job.msgTime >= createTimes[job.job_id]) {
              rs.jobAudit.jobWarningClass = '';
              rs.jobAudit.jobWarningText = mlEscape(job.highestLevelText);
              if (job.highestLevel === 1) {
                rs.jobAudit.jobWarningClass = 'job-warning fa fa-exclamation-circle';
              } else if (job.highestLevel === 2) {
                rs.jobAudit.jobWarningClass = 'job-error fa fa-exclamation-triangle';
              }
            }
          });

        }).catch((resp) => {
          console.log('loadAuditSummary: audit messages for all jobs could not be loaded');

          if (resp.message) {
            msgs.error(resp.message);
          }
        });
    }


    // create modal dialog for editing job descriptions
    function openEditJobWindow(job) {
      $modal.open({
        template: editJobTemplate,
        controller: 'MlEditJobModal',
        backdrop: 'static',
        keyboard: false,
        size: 'lg',
        resolve: {
          params: function () {
            return {
              pscope: $scope,
              job: job,
            };
          }
        }
      });
    }

    // create modal dialog for creating a watch
    $scope.openCreateWatchWindow = function (job) {
      $modal.open({
        template: createWatchTemplate,
        controller: 'MlCreateWatchModal',
        backdrop: 'static',
        keyboard: false,
        resolve: {
          params: function () {
            return {
              job: job,
            };
          }
        }
      });
    };

    // apply the text entered in the filter field and reload the jobs list
    $scope.applyFilter = function () {

    // clear the previous filter timeout
      $timeout.cancel(jobFilterTimeout);

      // create a timeout to redraw the jobs list based on the filter
      // a timeout is used as the user may still be in the process of
      // typing the filter when this function is first called.
      // after a second, if no more keystrokes have happened, redraw the jobs list
      jobFilterTimeout = $timeout(() => {
        // create the regexp used for highlighting the filter string for each job
        if ($scope.filterText) {
          filterRegexp = new RegExp(`(${$scope.filterText})`, 'gi');
        } else {
          filterRegexp = undefined;
        }

        displayJobs($scope.jobs);
        jobFilterTimeout = undefined;
      }, 1000);

      // display the spinner icon after 250ms of typing.
      // the spinner is a nice way of showing that something is
      // happening as we're stalling for the user to stop typing.
      // const $progress = $('.job-filter-progress-icon');
      $timeout(() => {
        $scope.filterIcon = 1;
      }, 250);
    };

    // clear the filter text and regexp and apply the empty filter
    $scope.clearFilter = function () {
      $scope.filterText = '';
      $scope.filterRegexp = undefined;
      $scope.applyFilter();
    };

    // highlight which part of the job ID matches the filter text
    function filterHighlight(txt) {
      if ($scope.filterText && filterRegexp) {
        txt = txt.replace(filterRegexp, '<span class="ml-mark">$1</span>');
      }
      return txt;
    }

    function jobsUpdated(jobs) {
      $scope.noJobsCreated = (jobs.length === 0);
      // jobs have been updated, redraw the list
      displayJobs(jobs);
    }

    $scope.refreshJob = function (jobId) {
      mlJobService.refreshJob(jobId)
        .then((resp) => {
          jobsUpdated(resp.jobs);
        }).catch((resp) => {
          jobsUpdated(resp.jobs);
        });
    };

    function refreshJobs() {
      mlJobService.loadJobs()
        .then((resp) => {
          mlCalendarService.loadCalendars(resp.jobs)
            .then(() => {
              jobsUpdated(resp.jobs);
            });
        })
        .catch((resp) => {
          jobsUpdated(resp.jobs);
        });
    }

    refreshJobs();

    $scope.$on('jobsUpdated', () => {
      refreshJobs();
    });

    // create watch modal is triggered after the start datafeed modal,
    // and so needs to be called via a broadcast.
    $scope.$on('openCreateWatchWindow', (e, job) => {
      $scope.openCreateWatchWindow(job);
    });

    $scope.$on('$destroy', () => {
      clearTimeout(refreshJobsTimeout);
    });
  });
