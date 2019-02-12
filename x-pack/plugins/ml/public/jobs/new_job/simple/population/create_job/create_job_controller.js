/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import _ from 'lodash';
import 'angular-ui-select';

import { aggTypes } from 'ui/agg_types/index';
import { addJobValidationMethods } from 'plugins/ml/../common/util/validation_utils';
import { parseInterval } from 'plugins/ml/../common/util/parse_interval';

import dateMath from '@elastic/datemath';
import angular from 'angular';

import uiRoutes from 'ui/routes';
import { checkLicenseExpired } from 'plugins/ml/license/check_license';
import { checkCreateJobsPrivilege } from 'plugins/ml/privilege/check_privilege';
import { IntervalHelperProvider } from 'plugins/ml/util/ml_time_buckets';
import { getCreatePopulationJobBreadcrumbs } from 'plugins/ml/jobs/breadcrumbs';
import { filterAggTypes } from 'plugins/ml/jobs/new_job/simple/components/utils/filter_agg_types';
import { validateJob } from 'plugins/ml/jobs/new_job/simple/components/utils/validate_job';
import { adjustIntervalDisplayed } from 'plugins/ml/jobs/new_job/simple/components/utils/adjust_interval';
import { CHART_STATE, JOB_STATE } from 'plugins/ml/jobs/new_job/simple/components/constants/states';
import { createFields } from 'plugins/ml/jobs/new_job/simple/components/utils/create_fields';
import { loadCurrentIndexPattern, loadCurrentSavedSearch, timeBasedIndexCheck } from 'plugins/ml/util/index_utils';
import { ChartDataUtilsProvider } from 'plugins/ml/jobs/new_job/simple/components/utils/chart_data_utils.js';
import { checkMlNodesAvailable } from 'plugins/ml/ml_nodes_check/check_ml_nodes';
import { loadNewJobDefaults, newJobDefaults } from 'plugins/ml/jobs/new_job/utils/new_job_defaults';
import { mlEscape } from 'plugins/ml/util/string_utils';
import {
  SearchItemsProvider,
  addNewJobToRecentlyAccessed,
  moveToAdvancedJobCreationProvider,
  focusOnResultsLink } from 'plugins/ml/jobs/new_job/utils/new_job_utils';
import { mlJobService } from 'plugins/ml/services/job_service';
import { preLoadJob } from 'plugins/ml/jobs/new_job/simple/components/utils/prepopulate_job_settings';
import { PopulationJobServiceProvider } from './create_job_service';
import { FullTimeRangeSelectorServiceProvider } from 'plugins/ml/components/full_time_range_selector/full_time_range_selector_service';
import { mlMessageBarService } from 'plugins/ml/components/messagebar/messagebar_service';
import template from './create_job.html';
import { timefilter } from 'ui/timefilter';

uiRoutes
  .when('/jobs/new_job/simple/population', {
    template,
    k7Breadcrumbs: getCreatePopulationJobBreadcrumbs,
    resolve: {
      CheckLicense: checkLicenseExpired,
      privileges: checkCreateJobsPrivilege,
      indexPattern: loadCurrentIndexPattern,
      savedSearch: loadCurrentSavedSearch,
      checkMlNodesAvailable,
      loadNewJobDefaults,
    }
  });

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module
  .controller('MlCreatePopulationJob', function (
    $scope,
    $timeout,
    Private,
    AppState,
    i18n) {

    timefilter.enableTimeRangeSelector();
    timefilter.disableAutoRefreshSelector();
    const msgs = mlMessageBarService;
    const MlTimeBuckets = Private(IntervalHelperProvider);
    const moveToAdvancedJobCreation = Private(moveToAdvancedJobCreationProvider);
    const chartDataUtils = Private(ChartDataUtilsProvider);
    const mlPopulationJobService = Private(PopulationJobServiceProvider);
    const mlFullTimeRangeSelectorService = Private(FullTimeRangeSelectorServiceProvider);
    $scope.addNewJobToRecentlyAccessed = addNewJobToRecentlyAccessed;

    const stateDefaults = {
      mlJobSettings: {}
    };
    const appState = new AppState(stateDefaults);

    mlPopulationJobService.clearChartData();
    $scope.chartData = mlPopulationJobService.chartData;
    const jobDefaults = newJobDefaults();

    const PAGE_WIDTH = angular.element('.population-job-container').width();
    const BAR_TARGET = (PAGE_WIDTH > 1600) ? 800 : (PAGE_WIDTH / 2);
    const MAX_BARS = BAR_TARGET + (BAR_TARGET / 100) * 100; // 100% larger that bar target
    const REFRESH_INTERVAL_MS = 100;
    const MAX_BUCKET_DIFF = 3;
    const METRIC_AGG_TYPE = 'metrics';
    const DEFAULT_MODEL_MEMORY_LIMIT = jobDefaults.anomaly_detectors.model_memory_limit;

    let refreshCounter = 0;

    $scope.JOB_STATE = JOB_STATE;
    $scope.jobState = $scope.JOB_STATE.NOT_STARTED;

    $scope.CHART_STATE = CHART_STATE;
    $scope.chartStates = {
      eventRate: CHART_STATE.LOADING,
      fields: {}
    };

    // flag to stop all results polling if the user navigates away from this page
    let globalForceStop = false;

    const createSearchItems = Private(SearchItemsProvider);
    const {
      indexPattern,
      savedSearch,
      query,
      filters,
      combinedQuery } = createSearchItems();

    timeBasedIndexCheck(indexPattern, true);

    const pageTitle = (savedSearch.id !== undefined) ?
      i18n('xpack.ml.newJob.simple.population.savedSearchPageTitle', {
        defaultMessage: 'saved search {savedSearchTitle}',
        values: { savedSearchTitle: savedSearch.title }
      }) :
      i18n('xpack.ml.newJob.simple.population.indexPatternPageTitle', {
        defaultMessage: 'index pattern {indexPatternTitle}',
        values: { indexPatternTitle: indexPattern.title }
      });

    $scope.analysisStoppingLabel = i18n('xpack.ml.newJob.simple.population.analysisStoppingLabel', {
      defaultMessage: 'Analysis stopping'
    });
    $scope.stopAnalysisLabel = i18n('xpack.ml.newJob.simple.population.stopAnalysisLabel', {
      defaultMessage: 'Stop analysis'
    });

    $scope.ui = {
      indexPattern,
      pageTitle,
      showJobInput: true,
      showJobFinished: false,
      dirty: false,
      formValid: false,
      bucketSpanValid: true,
      bucketSpanEstimator: { status: 0, message: '' },
      cardinalityValidator: { status: 0, message: '' },
      aggTypeOptions: filterAggTypes(aggTypes.byType[METRIC_AGG_TYPE]),
      fields: [],
      overFields: [],
      splitFields: [],
      timeFields: [],
      splitText: '',
      intervals: [{
        title: i18n('xpack.ml.newJob.simple.population.intervals.autoTitle', {
          defaultMessage: 'Auto'
        }),
        value: 'auto',
      }, {
        title: i18n('xpack.ml.newJob.simple.population.intervals.millisecondTitle', {
          defaultMessage: 'Millisecond'
        }),
        value: 'ms'
      }, {
        title: i18n('xpack.ml.newJob.simple.population.intervals.secondTitle', {
          defaultMessage: 'Second'
        }),
        value: 's'
      }, {
        title: i18n('xpack.ml.newJob.simple.population.intervals.minuteTitle', {
          defaultMessage: 'Minute'
        }),
        value: 'm'
      }, {
        title: i18n('xpack.ml.newJob.simple.population.intervals.hourlyTitle', {
          defaultMessage: 'Hourly'
        }),
        value: 'h'
      }, {
        title: i18n('xpack.ml.newJob.simple.population.intervals.dailyTitle', {
          defaultMessage: 'Daily'
        }),
        value: 'd'
      }, {
        title: i18n('xpack.ml.newJob.simple.population.intervals.weeklyTitle', {
          defaultMessage: 'Weekly'
        }),
        value: 'w'
      }, {
        title: i18n('xpack.ml.newJob.simple.population.intervals.monthlyTitle', {
          defaultMessage: 'Monthly'
        }),
        value: 'M'
      }, {
        title: i18n('xpack.ml.newJob.simple.population.intervals.yearlyTitle', {
          defaultMessage: 'Yearly'
        }),
        value: 'y'
      }, {
        title: i18n('xpack.ml.newJob.simple.population.intervals.customTitle', {
          defaultMessage: 'Custom'
        }),
        value: 'custom'
      }],
      eventRateChartHeight: 100,
      chartHeight: 150,
      showFieldCharts: false,
      showAdvanced: false,
      validation: {
        checks: {
          jobId: { valid: true },
          groupIds: { valid: true },
          modelMemoryLimit: { valid: true },
          duplicateDetectors: { valid: true }
        },
      },
      isOverField(field) {
        return (field.name === $scope.formConfig.overField.name) ? null : field;
      }
    };

    $scope.formConfig = {
      agg: {
        type: undefined
      },
      fields: [],
      bucketSpan: '15m',
      chartInterval: undefined,
      resultsIntervalSeconds: undefined,
      start: 0,
      end: 0,
      overField: undefined,
      timeField: indexPattern.timeFieldName,
      influencerFields: [],
      firstSplitFieldName: undefined,
      indexPattern: indexPattern,
      query,
      filters,
      combinedQuery,
      usesSavedSearch: (savedSearch.id !== undefined),
      jobId: '',
      description: '',
      jobGroups: [],
      useDedicatedIndex: false,
      enableModelPlot: false,
      modelMemoryLimit: DEFAULT_MODEL_MEMORY_LIMIT
    };

    $scope.formChange = function (refreshCardLayout) {
      $scope.ui.isFormValid();
      $scope.ui.dirty = true;

      $scope.loadVis();
      if (refreshCardLayout) {
        sortSplitCards();
      }
    };

    $scope.overChange = function () {
      $scope.addDefaultFieldsToInfluencerList();
      $scope.formChange();
    };

    $scope.splitChange = function (fieldIndex, splitField) {
      return new Promise((resolve) => {
        $scope.formConfig.fields[fieldIndex].firstSplitFieldName = undefined;

        if (splitField !== undefined) {
          $scope.formConfig.fields[fieldIndex].splitField =  splitField;

          $scope.addDefaultFieldsToInfluencerList();

          chartDataUtils.getSplitFields($scope.formConfig, splitField.name, 10)
            .then((resp) => {
              if (resp.results.values && resp.results.values.length) {
                $scope.formConfig.fields[fieldIndex].firstSplitFieldName = resp.results.values[0];
                $scope.formConfig.fields[fieldIndex].cardLabels = resp.results.values;
              }

              drawCards(fieldIndex, true);
              $scope.formChange();
              resolve();
            });
        } else {
          $scope.formConfig.fields[fieldIndex].splitField = undefined;
          $scope.formConfig.fields[fieldIndex].cardLabels = undefined;
          setFieldsChartStates(CHART_STATE.LOADING);
          $scope.toggleInfluencerChange();
          $scope.ui.splitText = '';
          destroyCards(fieldIndex);
          $scope.formChange();
          resolve();
        }
      });
    };

    $scope.splitReset = function (fieldIndex) {
      $scope.splitChange(fieldIndex, undefined);
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

    function initAgg() {
      _.each($scope.ui.aggTypeOptions, (agg) => {
        if (agg.mlName === 'mean') {
          $scope.formConfig.agg.type = agg;
        }
      });
    }

    $scope.ui.isFormValid = function () {
      if ($scope.formConfig.agg.type === undefined ||
        $scope.formConfig.timeField === undefined ||
        $scope.formConfig.fields.length === 0) {

        $scope.ui.formValid = false;
      } else {
        $scope.ui.formValid = true;
      }
      return $scope.ui.formValid;
    };

    $scope.loadVis = function () {
      const thisLoadTimestamp = Date.now();
      $scope.chartData.lastLoadTimestamp = thisLoadTimestamp;

      setTime();
      $scope.ui.isFormValid();

      $scope.ui.showJobInput = true;
      $scope.ui.showJobFinished = false;

      $scope.ui.dirty = false;

      mlPopulationJobService.clearChartData();

      setFieldsChartStates(CHART_STATE.LOADING);

      if ($scope.formConfig.fields.length) {
        $scope.ui.showFieldCharts = true;
        mlPopulationJobService.getLineChartResults($scope.formConfig, thisLoadTimestamp)
          .then((resp) => {
            $scope.$applyAsync();
            loadDocCountData(resp.detectors);
          })
          .catch((resp) => {
            msgs.error(resp.message);
            $scope.formConfig.fields.forEach(field => {
              const id = field.id;
              $scope.chartStates.fields[id] = CHART_STATE.NO_RESULTS;
            });
            $scope.$applyAsync();
          });
      } else {
        $scope.ui.showFieldCharts = false;
        loadDocCountData([]);
      }

      function loadDocCountData(dtrs) {
        chartDataUtils.loadDocCountData($scope.formConfig, $scope.chartData)
          .then((resp) => {
            if (thisLoadTimestamp === $scope.chartData.lastLoadTimestamp) {
              _.each(dtrs, (dtr, id) => {
                const state = (resp.totalResults) ? CHART_STATE.LOADED : CHART_STATE.NO_RESULTS;
                $scope.chartStates.fields[id] = state;
              });

              $scope.chartData.lastLoadTimestamp = null;
              chartDataUtils.updateChartMargin($scope.chartData);
              $scope.chartStates.eventRate = (resp.totalResults) ? CHART_STATE.LOADED : CHART_STATE.NO_RESULTS;
              $scope.$broadcast('render');
            }
          })
          .catch((resp) => {
            $scope.chartStates.eventRate = CHART_STATE.NO_RESULTS;
            msgs.error(resp.message);
          })
          .then(() => {
            $scope.$applyAsync();
          });
      }
    };

    function setFieldsChartStates(state) {
      _.each($scope.chartStates.fields, (chart, key) => {
        $scope.chartStates.fields[key] = state;
      });
      $scope.$applyAsync();
    }

    function drawCards(fieldIndex, animate = true) {
      const labels = $scope.formConfig.fields[fieldIndex].cardLabels;
      const $frontCard = angular.element(`.population-job-container .detector-container.card-${fieldIndex} .card-front`);
      $frontCard.addClass('card');
      $frontCard.find('.card-title').text(labels[0]);

      let marginTop = (labels.length > 1) ? 54 : 0;
      $frontCard.css('margin-top', marginTop);

      let backCardTitle = '';
      if (labels.length === 2) {
      // create a dummy label if there are only 2 cards, as the space will be visible
        backCardTitle = $scope.formConfig.fields[Object.keys($scope.formConfig.fields)[0]].agg.type.title;
        backCardTitle += ' ';
        backCardTitle += Object.keys($scope.formConfig.fields)[0];
      }

      angular.element(`.detector-container.card-${fieldIndex} .card-behind`).remove();

      for (let i = 0; i < labels.length; i++) {
        let el = `<div class="card card-behind card-behind-${i}"><div class="card-title">`;
        el += mlEscape(labels[i]);
        el += '</div><label class="kuiFormLabel">';
        el += mlEscape(backCardTitle);
        el += '</label></div>';

        const $backCard = angular.element(el);
        $backCard.css('z-index', (9 - i));

        $backCard.insertBefore($frontCard);
      }

      const cardsBehind = angular.element(`.detector-container.card-${fieldIndex} .card-behind`);

      for (let i = 0; i < cardsBehind.length; i++) {
        cardsBehind[i].style.marginTop = marginTop + 'px';

        marginTop -= (10 - (i * (10 / labels.length))) * (10 / labels.length);
      }
      let i = 0;
      let then = window.performance.now();
      const fps = 20;
      const fpsInterval = 1000 / fps;

      function fadeCard(callTime) {
        if (i < cardsBehind.length) {
          const now = callTime;
          const elapsed = now - then;
          if (elapsed > fpsInterval) {
            cardsBehind[i].style.opacity = 1;
            i++;
            then = now - (elapsed % fpsInterval);
          }
          window.requestAnimationFrame(fadeCard);
        }
      }
      if (animate) {
        fadeCard();
      } else {
        for (let j = 0; j < cardsBehind.length; j++) {
          cardsBehind[j].style.opacity = 1;
        }
      }
    }

    function destroyCards(fieldIndex) {
      angular.element(`.detector-container.card-${fieldIndex} .card-behind`).remove();

      const $frontCard = angular.element(`.population-job-container .detector-container.card-${fieldIndex} .card-front`);
      $frontCard.removeClass('card');
      $frontCard.find('.card-title').text('');
      $frontCard.css('margin-top', 0);
    }

    function sortSplitCards() {
    // cards may have moved, so redraw or remove the splits if needed
    // wrapped in a timeout to allow the digest to complete after the charts
    // has been placed on the page
      $timeout(() => {
        $scope.formConfig.fields.forEach((f, i) => {
          if (f.splitField === undefined) {
            destroyCards(i);
          } else {
            drawCards(i, false);
          }
        });
      }, 0);
    }

    let refreshInterval = REFRESH_INTERVAL_MS;
    // function for creating a new job.
    // creates the job, opens it, creates the datafeed and starts it.
    // the job may fail to open, but the datafeed should still be created
    // if the job save was successful.
    $scope.createJob = function () {
      const tempJob = mlPopulationJobService.getJobFromConfig($scope.formConfig);
      if (validateJob(tempJob, $scope.ui.validation.checks)) {
        msgs.clear();
        // create the new job
        mlPopulationJobService.createJob($scope.formConfig)
          .then((job) => {
            // if save was successful, open the job
            mlJobService.openJob(job.job_id)
              .then(() => {
                // if open was successful create a new datafeed
                saveNewDatafeed(job, true);
              })
              .catch((resp) => {
                msgs.error(
                  i18n('xpack.ml.newJob.simple.population.couldNotOpenJobErrorMessage', {
                    defaultMessage: 'Could not open job:',
                  }),
                  resp
                );
                msgs.error(
                  i18n('xpack.ml.newJob.simple.population.jobCreatedAndDatafeedCreatingAnywayErrorMessage', {
                    defaultMessage: 'Job created, creating datafeed anyway'
                  })
                );
                // if open failed, still attempt to create the datafeed
                // as it may have failed because we've hit the limit of open jobs
                saveNewDatafeed(job, false);
              });
          })
          .catch((resp) => {
            // save failed
            msgs.error(
              i18n('xpack.ml.newJob.simple.population.saveFailedErrorMessage', {
                defaultMessage: 'Save failed:',
              }),
              resp.resp
            );
            $scope.$applyAsync();
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
              mlPopulationJobService.startDatafeed($scope.formConfig)
                .then(() => {
                  $scope.jobState = JOB_STATE.RUNNING;
                  refreshCounter = 0;
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
                    'explorer');

                  focusOnResultsLink('job_running_view_results_link', $timeout);

                  loadCharts();
                })
                .catch((resp) => {
                  // datafeed failed
                  msgs.error(
                    i18n('xpack.ml.newJob.simple.population.couldNotStartDatafeedErrorMessage', {
                      defaultMessage: 'Could not start datafeed:'
                    }),
                    resp
                  );
                })
                .then(() => {
                  $scope.$applyAsync();
                });
            } else {
              $scope.$applyAsync();
            }
          })
          .catch((resp) => {
            msgs.error(
              i18n('xpack.ml.newJob.simple.population.saveDatafeedFailedErrorMessage', {
                defaultMessage: 'Save datafeed failed:',
              }),
              resp
            );
            $scope.$applyAsync();
          });
      }
    };

    // expose this function so it can be used in the enable model plot checkbox directive
    $scope.getJobFromConfig = mlPopulationJobService.getJobFromConfig;

    addJobValidationMethods($scope, mlPopulationJobService);

    function loadCharts() {
      let forceStop = globalForceStop;
      // the percentage doesn't always reach 100, so periodically check the datafeed status
      // to see if the datafeed has stopped
      const counterLimit = 20 - (refreshInterval / REFRESH_INTERVAL_MS);
      if (refreshCounter >=  counterLimit) {
        refreshCounter = 0;
        mlJobService.updateSingleJobDatafeedState($scope.formConfig.jobId)
          .then((state) => {
            if (state === 'stopped') {
              console.log('Stopping poll because datafeed state is: ' + state);
              $scope.$applyAsync();
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
        reloadJobSwimlaneData()
          .then(() => {
            reloadDetectorSwimlane()
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
                  focusOnResultsLink('job_finished_view_results_link', $timeout);
                }
                jobCheck();
              });
          });
      }
    }

    function jobCheck() {
      if ($scope.jobState === JOB_STATE.RUNNING || $scope.jobState === JOB_STATE.STOPPING) {
        refreshInterval = adjustRefreshInterval($scope.chartData.loadingDifference, refreshInterval);
        _.delay(loadCharts, refreshInterval);
      } else {
        _.each($scope.chartData.detectors, (chart) => {
          chart.percentComplete = 100;
        });
      }
      if ($scope.chartData.percentComplete > 0) {
      // fade the bar chart once we have results
        toggleSwimlaneVisibility();
      }
      $scope.$applyAsync();
      $scope.$broadcast('render-results');
    }

    function reloadJobSwimlaneData() {
      return chartDataUtils.loadJobSwimlaneData($scope.formConfig, $scope.chartData);
    }


    function reloadDetectorSwimlane() {
      return chartDataUtils.loadDetectorSwimlaneData($scope.formConfig, $scope.chartData);
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
      toggleSwimlaneVisibility();

      window.setTimeout(() => {
        $scope.ui.showJobInput = true;
        $scope.loadVis();
      }, 500);
    };

    function toggleSwimlaneVisibility() {
      if ($scope.jobState === JOB_STATE.NOT_STARTED) {
        angular.element('.swimlane-cells').css('opacity', 0);
        angular.element('.bar').css('opacity', 1);
      } else {
        angular.element('.bar').css('opacity', 0.1);
      }
    }

    $scope.stopJob = function () {
    // setting the status to STOPPING disables the stop button
      $scope.jobState = JOB_STATE.STOPPING;
      mlPopulationJobService.stopDatafeed($scope.formConfig)
        .catch()
        .then(() => {
          $scope.$applyAsync();
        });
    };

    $scope.moveToAdvancedJobCreation = function () {
      const job = mlPopulationJobService.getJobFromConfig($scope.formConfig);
      moveToAdvancedJobCreation(job);
    };

    $scope.setFullTimeRange = function () {
      return mlFullTimeRangeSelectorService.setFullTimeRange($scope.ui.indexPattern, $scope.formConfig.combinedQuery);
    };

    initAgg();
    createFields($scope, indexPattern);

    $scope.loadVis();

    $scope.$evalAsync(() => {
      preLoadJob($scope, appState);
    });

    $scope.$listenAndDigestAsync(timefilter, 'fetch', $scope.loadVis);

    $scope.$on('$destroy', () => {
      globalForceStop = true;
      angular.element(window).off('resize');
    });
  });
