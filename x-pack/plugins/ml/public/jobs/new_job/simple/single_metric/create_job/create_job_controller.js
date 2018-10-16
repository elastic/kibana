/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import _ from 'lodash';

import { aggTypes } from 'ui/agg_types';
import { addJobValidationMethods } from 'plugins/ml/../common/util/validation_utils';
import { parseInterval } from 'plugins/ml/../common/util/parse_interval';

import dateMath from '@kbn/datemath';
import angular from 'angular';

import uiRoutes from 'ui/routes';
import { getSafeAggregationName } from 'plugins/ml/../common/util/job_utils';
import { checkLicenseExpired } from 'plugins/ml/license/check_license';
import { checkCreateJobsPrivilege } from 'plugins/ml/privilege/check_privilege';
import { IntervalHelperProvider } from 'plugins/ml/util/ml_time_buckets';
import { filterAggTypes } from 'plugins/ml/jobs/new_job/simple/components/utils/filter_agg_types';
import { validateJob } from 'plugins/ml/jobs/new_job/simple/components/utils/validate_job';
import { adjustIntervalDisplayed } from 'plugins/ml/jobs/new_job/simple/components/utils/adjust_interval';
import { getIndexedFields } from 'plugins/ml/jobs/new_job/simple/components/utils/create_fields';
import { changeJobIDCase } from 'plugins/ml/jobs/new_job/simple/components/general_job_details/change_job_id_case';
import { CHART_STATE, JOB_STATE } from 'plugins/ml/jobs/new_job/simple/components/constants/states';
import { loadCurrentIndexPattern, loadCurrentSavedSearch, timeBasedIndexCheck } from 'plugins/ml/util/index_utils';
import { checkMlNodesAvailable } from 'plugins/ml/ml_nodes_check/check_ml_nodes';
import { loadNewJobDefaults } from 'plugins/ml/jobs/new_job/utils/new_job_defaults';
import {
  createSearchItems,
  addNewJobToRecentlyAccessed,
  moveToAdvancedJobCreationProvider } from 'plugins/ml/jobs/new_job/utils/new_job_utils';
import { mlJobService } from 'plugins/ml/services/job_service';
import { preLoadJob } from 'plugins/ml/jobs/new_job/simple/components/utils/prepopulate_job_settings';
import { SingleMetricJobServiceProvider } from './create_job_service';
import { FullTimeRangeSelectorServiceProvider } from 'plugins/ml/components/full_time_range_selector/full_time_range_selector_service';
import { mlMessageBarService } from 'plugins/ml/components/messagebar/messagebar_service';
import { initPromise } from 'plugins/ml/util/promise';

import template from './create_job.html';

import { timefilter } from 'ui/timefilter';

uiRoutes
  .when('/jobs/new_job/simple/single_metric', {
    template,
    resolve: {
      CheckLicense: checkLicenseExpired,
      privileges: checkCreateJobsPrivilege,
      indexPattern: loadCurrentIndexPattern,
      savedSearch: loadCurrentSavedSearch,
      checkMlNodesAvailable,
      loadNewJobDefaults,
      initPromise: initPromise(true)
    }
  });

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module
  .controller('MlCreateSingleMetricJob', function (
    $scope,
    $route,
    $filter,
    Private,
    AppState) {

    timefilter.enableTimeRangeSelector();
    timefilter.disableAutoRefreshSelector();
    const msgs = mlMessageBarService;
    const MlTimeBuckets = Private(IntervalHelperProvider);
    const moveToAdvancedJobCreation = Private(moveToAdvancedJobCreationProvider);
    const mlSingleMetricJobService = Private(SingleMetricJobServiceProvider);
    const mlFullTimeRangeSelectorService = Private(FullTimeRangeSelectorServiceProvider);

    const stateDefaults = {
      mlJobSettings: {}
    };
    const appState = new AppState(stateDefaults);

    $scope.index = $route.current.params.index;
    $scope.chartData = mlSingleMetricJobService.chartData;
    $scope.changeJobIDCase = changeJobIDCase;
    $scope.addNewJobToRecentlyAccessed = addNewJobToRecentlyAccessed;

    const PAGE_WIDTH = angular.element('.single-metric-job-container').width();
    const BAR_TARGET = (PAGE_WIDTH > 2000) ? 1000 : (PAGE_WIDTH / 2);
    const MAX_BARS = BAR_TARGET + (BAR_TARGET / 100) * 100; // 100% larger than bar target
    const REFRESH_INTERVAL_MS = 100;
    const MAX_BUCKET_DIFF = 3;
    const METRIC_AGG_TYPE = 'metrics';
    const DEFAULT_MODEL_MEMORY_LIMIT = '10MB';

    const jobProgressChecks = {
      25: false,
      50: false,
      75: false,
    };

    let refreshCounter = 0;

    $scope.JOB_STATE = JOB_STATE;
    $scope.jobState = $scope.JOB_STATE.NOT_STARTED;

    $scope.CHART_STATE = CHART_STATE;
    $scope.chartState = CHART_STATE.NOT_STARTED;

    // flag to stop all results polling if the user navigates away from this page
    let globalForceStop = false;

    const {
      indexPattern,
      savedSearch,
      query,
      filters,
      combinedQuery } = createSearchItems($route);

    timeBasedIndexCheck(indexPattern, true);

    const pageTitle = (savedSearch.id !== undefined) ?
      `saved search ${savedSearch.title}` : `index pattern ${indexPattern.title}`;

    $scope.ui = {
      indexPattern,
      pageTitle,
      showJobInput: false,
      showJobFinished: false,
      dirty: true,
      formValid: false,
      bucketSpanValid: true,
      bucketSpanEstimator: { status: 0, message: '' },
      aggTypeOptions: filterAggTypes(aggTypes.byType[METRIC_AGG_TYPE]),
      fields: [],
      timeFields: [],
      intervals: [{
        title: 'Auto',
        value: 'auto',
      /*enabled: function (agg) {
        // not only do we need a time field, but the selected field needs
        // to be the time field. (see #3028)
        return agg.fieldIsTimeField();
      }*/
      }, {
        title: 'Millisecond',
        value: 'ms'
      }, {
        title: 'Second',
        value: 's'
      }, {
        title: 'Minute',
        value: 'm'
      }, {
        title: 'Hourly',
        value: 'h'
      }, {
        title: 'Daily',
        value: 'd'
      }, {
        title: 'Weekly',
        value: 'w'
      }, {
        title: 'Monthly',
        value: 'M'
      }, {
        title: 'Yearly',
        value: 'y'
      }, {
        title: 'Custom',
        value: 'custom'
      }],
      chartHeight: 310,
      showAdvanced: false,
      resultsUrl: '',
      validation: {
        checks: {
          jobId: { valid: true },
          groupIds: { valid: true },
          modelMemoryLimit: { valid: true }
        },
      },
      isCountOrSum: false
    };

    $scope.formConfig = {
      agg: {
        type: undefined
      },
      field: null,
      bucketSpan: '15m',
      chartInterval: undefined,
      resultsIntervalSeconds: undefined,
      start: 0,
      end: 0,
      timeField: indexPattern.timeFieldName,
      indexPattern: undefined,
      query,
      filters,
      combinedQuery,
      jobId: '',
      description: '',
      jobGroups: [],
      useDedicatedIndex: false,
      isSparseData: false,
      modelMemoryLimit: DEFAULT_MODEL_MEMORY_LIMIT
    };

    // this is passed into the bucketspan estimator and  reference to the guessBucketSpan function is inserted
    // to allow it for be called automatically without user interaction.
    $scope.bucketSpanEstimatorExportedFunctions = {};

    $scope.aggChange = function () {
      loadFields();
      $scope.ui.isFormValid();
      $scope.ui.dirty = true;

      $scope.ui.isCountOrSum = ($scope.formConfig.agg.type.dslName === 'count' || $scope.formConfig.agg.type.dslName === 'sum');

      // clear the field if count is selected
      if ($scope.formConfig.agg.type.dslName === 'count') {
        $scope.formConfig.field = null;
      }
    };

    $scope.fieldChange = function () {
      $scope.ui.isFormValid();
      $scope.ui.dirty = true;
    };

    $scope.bucketSpanFieldChange = function () {
      $scope.ui.isFormValid();
      $scope.ui.bucketSpanEstimator.status = 0;
      $scope.ui.bucketSpanEstimator.message = '';

      $scope.ui.bucketSpanValid = true;
      const bucketSpanInterval = parseInterval($scope.formConfig.bucketSpan);
      if(bucketSpanInterval === null || bucketSpanInterval.asMilliseconds() === 0) {
        $scope.ui.bucketSpanValid = false;
      }
    };

    function setTime() {
      $scope.ui.bucketSpanValid = true;
      $scope.formConfig.start = dateMath.parse(timefilter.getTime().from).valueOf();
      $scope.formConfig.end = dateMath.parse(timefilter.getTime().to).valueOf();
      $scope.formConfig.format = 'epoch_millis';

      const bucketSpanInterval = parseInterval($scope.formConfig.bucketSpan);
      if(bucketSpanInterval === null || bucketSpanInterval.asMilliseconds() === 0) {
        $scope.ui.bucketSpanValid = false;
      }

      const bounds = timefilter.getActiveBounds();
      $scope.formConfig.chartInterval = new MlTimeBuckets();
      $scope.formConfig.chartInterval.setBarTarget(BAR_TARGET);
      $scope.formConfig.chartInterval.setMaxBars(MAX_BARS);
      $scope.formConfig.chartInterval.setInterval('auto');
      $scope.formConfig.chartInterval.setBounds(bounds);

      adjustIntervalDisplayed($scope.formConfig);

      $scope.ui.isFormValid();
      $scope.ui.dirty = true;
    }

    function loadFields() {
      const agg = $scope.formConfig.agg;
      let fields = [];
      agg.type.params.forEach((param) => {
        if (param.name === 'field') {
          fields = getIndexedFields(indexPattern, param.filterFieldTypes.split(','));
        }
      });

      $scope.ui.fields = [];
      _.each(fields, (field, i) => {
        const id = getSafeAggregationName(field.displayName, i);
        const f = {
          id,
          name: field.displayName,
          tooltip: field.displayName,
          agg,
          mlType: field.mlType,
        };
        $scope.ui.fields.push(f);
      });

      if ($scope.ui.fields.length === 1 ||
      ($scope.formConfig.field === null && agg.type.name === 'cardinality')) {
        $scope.formConfig.field = $scope.ui.fields[0];
      }
    }

    $scope.ui.isFormValid = function () {
      if ($scope.formConfig.agg.type === undefined ||
        $scope.formConfig.timeField === undefined) {

        $scope.ui.formValid = false;
      } else {
        $scope.ui.formValid = true;
      }
      return $scope.ui.formValid;
    };

    $scope.loadVis = function () {
      setTime();
      $scope.ui.isFormValid();

      if ($scope.ui.formValid) {

        $scope.ui.showJobInput = true;
        $scope.ui.showJobFinished = false;

        $scope.formConfig.indexPattern = indexPattern;
        $scope.ui.dirty = false;

        $scope.chartState = CHART_STATE.LOADING;

        mlSingleMetricJobService.getLineChartResults($scope.formConfig)
          .then((resp) => {
            $scope.chartState = (resp.totalResults) ? CHART_STATE.LOADED : CHART_STATE.NO_RESULTS;
          })
          .catch((resp) => {
            msgs.error(resp.message);
            $scope.chartState = CHART_STATE.NO_RESULTS;
          })
          .finally(() => {
            $scope.$broadcast('render');
          });
      }
    };

    let ignoreModel = false;
    let refreshInterval = REFRESH_INTERVAL_MS;
    // function for creating a new job.
    // creates the job, opens it, creates the datafeed and starts it.
    // the job may fail to open, but the datafeed should still be created
    // if the job save was successful.
    $scope.createJob = function () {
      const tempJob = mlSingleMetricJobService.getJobFromConfig($scope.formConfig);
      if (validateJob(tempJob, $scope.ui.validation.checks)) {
        msgs.clear();
        // create the new job
        mlSingleMetricJobService.createJob($scope.formConfig)
          .then((job) => {
            // if save was successful, open the job
            mlJobService.openJob(job.job_id)
              .then(() => {
                // if open was successful create a new datafeed
                saveNewDatafeed(job, true);
              })
              .catch((resp) => {
                msgs.error('Could not open job: ', resp);
                msgs.error('Job created, creating datafeed anyway');
                // if open failed, still attempt to create the datafeed
                // as it may have failed because we've hit the limit of open jobs
                saveNewDatafeed(job, false);
              });

          })
          .catch((resp) => {
            // save failed
            msgs.error('Save failed: ', resp.resp);
          });
      } else {
        // show the advanced section as the model memory limit is invalid
        if($scope.ui.validation.checks.modelMemoryLimit.valid === false) {
          $scope.ui.showAdvanced = true;
        }
      }

      // save new datafeed internal function
      // creates a new datafeed and attempts to start it depending
      // on startDatafeedAfterSave flag
      function saveNewDatafeed(job, startDatafeedAfterSave) {
        mlJobService.saveNewDatafeed(job.datafeed_config, job.job_id)
          .then(() => {

            if (startDatafeedAfterSave) {
              mlSingleMetricJobService.startDatafeed($scope.formConfig)
                .then(() => {
                  $scope.jobState = JOB_STATE.RUNNING;
                  refreshCounter = 0;
                  ignoreModel = false;
                  refreshInterval = REFRESH_INTERVAL_MS;
                  // create the interval size for querying results.
                  // it should not be smaller than the bucket_span
                  $scope.formConfig.resultsIntervalSeconds = $scope.formConfig.chartInterval.getInterval().asSeconds();
                  const bucketSpanSeconds = parseInterval($scope.formConfig.bucketSpan).asSeconds();
                  if ($scope.formConfig.resultsIntervalSeconds < bucketSpanSeconds) {
                    $scope.formConfig.resultsIntervalSeconds = bucketSpanSeconds;
                  }

                  $scope.resultsUrl = mlJobService.createResultsUrl(
                    [$scope.formConfig.jobId],
                    $scope.formConfig.start,
                    $scope.formConfig.end,
                    'timeseriesexplorer');

                  loadCharts();
                })
                .catch((resp) => {
                  // datafeed failed
                  msgs.error('Could not start datafeed: ', resp);
                });
            }
          })
          .catch((resp) => {
            msgs.error('Save datafeed failed: ', resp);
          });
      }
    };

    addJobValidationMethods($scope, mlSingleMetricJobService);

    function loadCharts() {
      let forceStop = globalForceStop;
      // the percentage doesn't always reach 100, so periodically check the datafeed state
      // to see if the datafeed has stopped
      const counterLimit = 20 - (refreshInterval / REFRESH_INTERVAL_MS);
      if (refreshCounter >=  counterLimit) {
        refreshCounter = 0;
        mlSingleMetricJobService.checkDatafeedState($scope.formConfig)
          .then((state) => {
            if (state === 'stopped') {
              console.log('Stopping poll because datafeed state is: ' + state);
              $scope.$broadcast('render-results');
              forceStop = true;
            }
            run();
          });
      } else {
        run();
      }

      function run() {
        refreshCounter++;
        reloadSwimlane()
          .then(() => {
            if (forceStop === false && $scope.chartData.percentComplete < 100) {
              // if state has been set to stopping (from the stop button), leave state as it is
              if ($scope.jobState === JOB_STATE.STOPPING) {
                $scope.jobState = JOB_STATE.STOPPING;
              } else {
                // otherwise assume the job is running
                $scope.jobState = JOB_STATE.RUNNING;
              }
            } else {
              $scope.jobState = JOB_STATE.FINISHED;
            }

            if (ignoreModel) {
              jobCheck();
            } else {

              // check to see if the percentage is past a threshold for reloading the full model
              let fullModelRefresh = false;
              _.each(jobProgressChecks, (c, i) => {
                if (jobProgressChecks[i] === false && $scope.chartData.percentComplete >= i) {
                  jobProgressChecks[i] = true;
                  fullModelRefresh = true;
                }
              });
              // the full model needs to be refreshed
              if (fullModelRefresh) {
                $scope.chartData.model = [];
              }

              reloadModelChart()
                .catch(() => {
                  // on the 10th model load failure, set ignoreModel to true to stop trying to load it.
                  if (refreshCounter % 10 === 0) {
                    console.log('Model has failed to load 10 times. Stop trying to load it.');
                    ignoreModel = true;
                  }
                })
                .finally(() => {
                  jobCheck();
                });
            }
          });
      }
    }

    function jobCheck() {
      let isLastRun = false;
      if ($scope.jobState === JOB_STATE.RUNNING || $scope.jobState === JOB_STATE.STOPPING) {
        refreshInterval = adjustRefreshInterval($scope.chartData.loadingDifference, refreshInterval);
        _.delay(loadCharts, refreshInterval);
      } else {
        $scope.chartData.percentComplete = 100;
        isLastRun = true;
      }

      if (isLastRun && !ignoreModel) {
      // at the very end of the job, reload the full model just in case there are
      // any jitters in the chart caused by previously loading the model mid job.
        $scope.chartData.model = [];
        reloadModelChart()
          .finally(() => {
            $scope.chartData.percentComplete = 100;
            $scope.$broadcast('render-results');
          });
      } else {
        $scope.$broadcast('render-results');
      }
    }

    function reloadModelChart() {
      return mlSingleMetricJobService.loadModelData($scope.formConfig);
    }


    function reloadSwimlane() {
      return mlSingleMetricJobService.loadSwimlaneData($scope.formConfig);
    }

    function adjustRefreshInterval(loadingDifference, currentInterval) {
      const INTERVAL_INCREASE_MS = 100;
      const MAX_INTERVAL = 10000;
      let interval = currentInterval;

      if (interval < MAX_INTERVAL) {
        if (loadingDifference < MAX_BUCKET_DIFF) {
          interval = interval + INTERVAL_INCREASE_MS;
        } else {
          if ((interval - INTERVAL_INCREASE_MS) >= REFRESH_INTERVAL_MS) {
            interval = interval - INTERVAL_INCREASE_MS;
          }
        }
      }
      return interval;
    }

    $scope.resetJob = function () {
      $scope.jobState = JOB_STATE.NOT_STARTED;
      angular.element('.model-chart, .swimlane').css('opacity', 0);

      _.each(jobProgressChecks, (c, i) => {
        jobProgressChecks[i] = false;
      });

      window.setTimeout(() => {
        $scope.ui.showJobInput = true;
        $scope.loadVis();
      }, 500);

    };

    $scope.stopJob = function () {
    // setting the state to STOPPING disables the stop button
      $scope.jobState = JOB_STATE.STOPPING;
      mlSingleMetricJobService.stopDatafeed($scope.formConfig);
    };

    $scope.moveToAdvancedJobCreation = function () {
      const job = mlSingleMetricJobService.getJobFromConfig($scope.formConfig);
      moveToAdvancedJobCreation(job);
    };

    $scope.setFullTimeRange = function () {
      return mlFullTimeRangeSelectorService.setFullTimeRange($scope.ui.indexPattern, $scope.formConfig.combinedQuery);
    };

    $scope.$listenAndDigestAsync(timefilter, 'fetch', $scope.loadVis);

    $scope.$on('$destroy', () => {
      globalForceStop = true;
    });

    $scope.$evalAsync(() => {
      preLoadJob($scope, appState);
    });

  });
