/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
  * Angular controller for the modal dialog which allows the
  * user to run and view time series forecasts.
  */

import _ from 'lodash';
import moment from 'moment';

import './styles/main.less';

import { FORECAST_REQUEST_STATE, JOB_STATE } from 'plugins/ml/../common/constants/states';
import { FieldsServiceProvider } from 'plugins/ml/services/fields_service';
import { parseInterval } from 'plugins/ml/../common/util/parse_interval';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.controller('MlForecastingModal', function (
  $scope,
  $timeout,
  $interval,
  $modalInstance,
  $modal,
  params,
  Private,
  mlForecastService,
  mlJobService,
  mlMessageBarService) {

  const FORECASTS_VIEW_MAX = 5;       // Display links to a maximum of 5 forecasts.
  const FORECAST_DURATION_MAX_MS = 4838400000; // Max forecast duration of 8 weeks.
  const WARN_NUM_PARTITIONS = 100;    // Warn about running a forecast with this number of field values.
  const FORECAST_STATS_POLL_FREQUENCY = 250;  // Frequency in ms at which to poll for forecast request stats.
  const WARN_NO_PROGRESS_MS = 120000; // If no progress in forecast request, abort check and warn.

  const REQUEST_STATES = {
    WAITING: 0,
    DONE: 1,
    ERROR: -1
  };
  $scope.REQUEST_STATES = REQUEST_STATES;

  $scope.newForecastDuration = '1d';
  $scope.newForecastDurationError = null;
  $scope.isForecastRunning = false;
  $scope.showFrom = params.earliest;
  $scope.previousForecasts = [];
  $scope.permissions = params.pscope.permissions;
  $scope.createPermissionFailureMessage = params.pscope.createPermissionFailureMessage;
  $scope.mlNodesAvailable = params.mlNodesAvailable;
  $scope.partitionsWarningNumber = WARN_NUM_PARTITIONS;
  $scope.showNumPartitionsWarning = false;
  $scope.runStatus = {
    forecastRequested: false
  };

  const job = params.job;
  const entities = params.entities;
  const loadForForecastId = params.pscope.loadForForecastId;
  let forecastChecker = null;

  const msgs = mlMessageBarService;
  msgs.clear();

  // The Run forecast controls will be disabled if the user does not have
  // canForecastJob privilege, or if the job is not in an opened or closed state.
  if (job.state !== JOB_STATE.OPENED && job.state !== JOB_STATE.CLOSED) {
    $scope.invalidJobState = job.state;
  }

  // Get the list of all the finished forecasts with results at or later than the specified 'from' time.
  const statusFinishedQuery = {
    term: {
      forecast_status: FORECAST_REQUEST_STATE.FINISHED
    }
  };
  mlForecastService.getForecastsSummary(job, statusFinishedQuery, $scope.showFrom, FORECASTS_VIEW_MAX)
    .then((resp) => {
      resp.forecasts.forEach((forecast) => {
        // Format run time of forecast just down to HH:mm
        forecast.runTime = moment(forecast.forecast_create_timestamp).format('MMMM Do YYYY, HH:mm');
        forecast.earliestTime = moment(forecast.forecast_start_timestamp).format('MMMM Do YYYY, HH:mm:ss');
        forecast.latestTime = moment(forecast.forecast_end_timestamp).format('MMMM Do YYYY, HH:mm:ss');
      });

      $scope.previousForecasts = resp.forecasts;
    })
    .catch((resp) => {
      console.log('Time series forecast modal - error obtaining forecasts summary:', resp);
      msgs.error('Error obtaining list of previous forecasts.', resp);
    });

  // Display a warning about running a forecast if there is high number
  // of partitioning fields.
  const entityFieldNames = _.map(entities, 'fieldName');
  if (entityFieldNames.length > 0) {
    const fieldsService = Private(FieldsServiceProvider);
    fieldsService.getCardinalityOfFields(
      job.datafeed_config.indices,
      job.datafeed_config.types,
      entityFieldNames,
      job.datafeed_config.query,
      job.data_description.time_field,
      job.data_counts.earliest_record_timestamp,
      job.data_counts.latest_record_timestamp)
      .then((results) => {
        let numPartitions = 1;
        _.each(results, (cardinality) => {
          numPartitions = numPartitions * cardinality;
        });
        $scope.showNumPartitionsWarning = (numPartitions > WARN_NUM_PARTITIONS);
        $scope.$apply();
      })
      .catch((resp) => {
        console.log('Time series forecast modal - error obtaining cardinality of fields:', resp);
      });
  }

  $scope.viewForecast = function (forecastId) {
    loadForForecastId(forecastId);
    $scope.close();
  };

  $scope.newForecastDurationChange = function () {
    $scope.newForecastDurationError = null;
    const duration = parseInterval($scope.newForecastDuration);
    if(duration === null) {
      $scope.newForecastDurationError = 'Invalid duration format';
    } else if (duration.asMilliseconds() > FORECAST_DURATION_MAX_MS) {
      $scope.newForecastDurationError = 'Forecast duration must not be greater than 8 weeks';
    } else if (duration.asMilliseconds() === 0) {
      $scope.newForecastDurationError = 'Forecast duration must not be zero';
    }
  };

  $scope.checkJobStateAndRunForecast = function () {
    // Checks the job state, opening a job if closed, then runs the forecast.
    msgs.clear();

    $scope.isForecastRunning = true;
    $scope.runStatus.forecastRequested = true;

    // A forecast can only be run on an opened job,
    // so open job if it is closed.
    if (job.state === JOB_STATE.CLOSED) {
      openJobAndRunForecast();
    } else {
      runForecast(false);
    }
  };

  $scope.close = function () {
    msgs.clear();
    $modalInstance.close();
  };

  $scope.$on('$destroy', () => {
    if (forecastChecker !== null) {
      $interval.cancel(forecastChecker);
    }
  });

  function openJobAndRunForecast() {
    // Opens a job in a 'closed' state prior to running a forecast.
    $scope.runStatus.jobOpening = REQUEST_STATES.WAITING;

    mlJobService.openJob(job.job_id)
      .then(() => {
      // If open was successful run the forecast, then close the job again.
        $scope.runStatus.jobOpening = REQUEST_STATES.DONE;
        runForecast(true);
      })
      .catch((resp) => {
        console.log('Time series forecast modal - could not open job:', resp);
        msgs.error('Error opening job before running forecast.', resp);
        $scope.isForecastRunning = false;
        $scope.runStatus.jobOpening = REQUEST_STATES.ERROR;
      });
  }

  function runForecastErrorHandler(resp) {
    $scope.runStatus.forecastProgress = REQUEST_STATES.ERROR;
    console.log('Time series forecast modal - error running forecast:', resp);
    if (resp && resp.message) {
      msgs.error(resp.message);
    } else {
      msgs.error('Unexpected response from running forecast. The request may have failed.');
    }
  }

  function runForecast(closeJobAfterRunning) {
    $scope.isForecastRunning = true;
    $scope.runStatus.forecastProgress = 0;

    // Always supply the duration to the endpoint in seconds as some of the moment duration
    // formats accepted by Kibana (w, M, y) are not valid formats in Elasticsearch.
    const durationInSeconds = parseInterval($scope.newForecastDuration).asSeconds();

    mlForecastService.runForecast(job.job_id, `${durationInSeconds}s`)
      .then((resp) => {
      // Endpoint will return { acknowledged:true, id: <now timestamp> } before forecast is complete.
      // So wait for results and then refresh the dashboard to the end of the forecast.
        if (resp.forecast_id !== undefined) {
          waitForForecastResults(resp.forecast_id, closeJobAfterRunning);
        } else {
          runForecastErrorHandler(resp);
        }
      })
      .catch(runForecastErrorHandler);

  }

  function waitForForecastResults(forecastId, closeJobAfterRunning) {
    // Obtain the stats for the forecast request and check forecast is progressing.
    // When the stats show the forecast is finished, load the
    // forecast results into the view.
    let previousProgress = 0;
    let noProgressMs = 0;
    forecastChecker = $interval(() => {
      mlForecastService.getForecastRequestStats(job, forecastId)
        .then((resp) => {
          const progress = _.get(resp, ['stats', 'forecast_progress'], previousProgress);
          const status = _.get(resp, ['stats', 'forecast_status']);

          // Update the progress (stats value is between 0 and 1).
          $scope.runStatus.forecastProgress = Math.round(100 * progress);

          // Display any messages returned in the request stats.
          const messages =  _.get(resp, ['stats', 'forecast_messages'], previousProgress);
          _.each(messages, (message) => {
            msgs.warning(message);
          });

          if (status === FORECAST_REQUEST_STATE.FINISHED) {
            $interval.cancel(forecastChecker);
            $scope.isForecastRunning = false;

            if (closeJobAfterRunning === true) {
              $scope.runStatus.jobClosing = REQUEST_STATES.WAITING;
              mlJobService.closeJob(job.job_id)
                .then(() => {
                  $scope.isForecastRunning = false;
                  $scope.runStatus.jobClosing = REQUEST_STATES.DONE;
                  loadForForecastId(forecastId);
                  closeAfterRunningForecast();
                })
                .catch((closeResp) => {
                  // Load the forecast data in the main page,
                  // but leave this dialog open so the error can be viewed.
                  msgs.error('Error closing job after running forecast.', closeResp);
                  $scope.runStatus.jobClosing = REQUEST_STATES.ERROR;
                  loadForForecastId(forecastId);
                  $scope.isForecastRunning = false;
                });
            } else {
              loadForForecastId(forecastId);
              closeAfterRunningForecast();
            }
          } else {
          // Display a warning and abort check if the forecast hasn't
          // progressed for WARN_NO_PROGRESS_MS.
            if (progress === previousProgress) {
              noProgressMs += FORECAST_STATS_POLL_FREQUENCY;
              if (noProgressMs > WARN_NO_PROGRESS_MS) {
                console.log(`Forecast request has not progressed for ${WARN_NO_PROGRESS_MS}ms. Cancelling check.`);
                msgs.error(`No progress reported for the new forecast for ${WARN_NO_PROGRESS_MS}ms. ` +
                'An error may have occurred whilst running the forecast.');

                // Try and load any results which may have been created.
                loadForForecastId(forecastId);
                $scope.runStatus.forecastProgress = REQUEST_STATES.ERROR;
                $interval.cancel(forecastChecker);
              }

            } else {
              previousProgress = progress;
            }
          }
        }).catch((resp) => {
          console.log('Time series forecast modal - error loading stats of forecast from elasticsearch:', resp);
          msgs.error('Error loading stats of running forecast.', resp);
          $scope.isForecastRunning = false;
          $scope.runStatus.forecastProgress = REQUEST_STATES.ERROR;
          $interval.cancel(forecastChecker);
        });
    }, FORECAST_STATS_POLL_FREQUENCY);

  }

  function closeAfterRunningForecast() {
    // Only close the dialog automatically after a forecast has run
    // if the message bar is clear. Otherwise the user may not catch
    // any messages returned in the forecast request stats.
    if (msgs.messages.length === 0) {
      // Wrap the close in a timeout to give the user a chance to see progress update.
      $timeout($scope.close, 1000);
    }
  }

});
