/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



const icalendar = require('icalendar');
import $ from 'jquery';
import moment from 'moment';

import 'plugins/ml/settings/scheduled_events/components/events_list';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.controller('MlImportEventsModal', function (
  $scope,
  $q,
  $timeout,
  $modalInstance) {

  $scope.loadingLock = false;
  $scope.allNewEvents = [];
  $scope.newEvents = [];
  $scope.fileLoaded = false;
  $scope.file = undefined;
  $scope.includePastEvents = false;
  $scope.showRecurringWarning = false;
  $scope.RECURRING_WARNING = 'Recurring events not supported. Only the first event will be imported.';

  $timeout(() => {
    $('.modal-dialog').width(750);
  }, 0);

  const MAX_FILE_SIZE_MB = 100;
  // called when a file is selected using the file browser
  $scope.fileNameChanged = function (event) {
    $scope.$apply(() => {
      if (event.target.files.length) {
        reset();
        $scope.file = event.target.files[0];
        if ($scope.file.size <= (MAX_FILE_SIZE_MB * 1000000)) {
          readFile($scope.file)
            .then((resp) => {
              try {
                $scope.allNewEvents = parseICSFile(resp.data);
                $scope.createEventsList();
                $scope.fileLoaded = true;
                $scope.loadingLock = false;
              } catch (error) {
                $scope.error = true;
                $scope.errorMessage = 'Could not parse ICS file';
              }
            })
            .catch((error) => {
              console.error(error);
              $scope.loadingLock = false;
            });
        } else {
          $scope.fileLoaded = false;
          $scope.loadingLock = false;
        }
      }
    });
  };

  function readFile(file) {
    return $q((resolve, reject) => {
      $scope.loadingLock = true;

      if (file && file.size) {
        const reader = new FileReader();
        reader.readAsText(file);

        reader.onload = (() => {
          return () => {
            $scope.loadingLock = false;
            const data = reader.result;
            if (data === '') {
              reject();
            } else {
              resolve({ data });
            }
          };
        })(file);
      } else {
        reject();
      }
    });
  }

  function reset() {
    $scope.file = undefined;
    $scope.fileLoaded = false;
    $scope.loadingLock = false;
    $scope.newEvents = [];
    $scope.error = false;
    $scope.errorMessage = '';
  }

  function parseICSFile(data) {
    const cal = icalendar.parse_calendar(data);
    return createEvents(cal);
  }

  function createEvents(ical) {
    const events = ical.events();
    const mlEvents = [];

    events.forEach((e) => {
      if (e.element === 'VEVENT') {
        const description = e.properties.SUMMARY;
        const start = e.properties.DTSTART;
        const end = e.properties.DTEND;
        const recurring = (e.properties.RRULE !== undefined);

        if (description && start && end && description.length && start.length && end.length) {
          mlEvents.push({
            description: description[0].value,
            start_time: start[0].value.valueOf(),
            end_time: end[0].value.valueOf(),
            asterisk: recurring
          });
        }
      }
    });
    return mlEvents;
  }

  // populate the newEvents list
  // filtering out past events if the checkbox is ticked
  $scope.createEventsList = function () {
    if ($scope.includePastEvents) {
      $scope.newEvents = [...$scope.allNewEvents];
    } else {
      const now = moment().valueOf();
      $scope.newEvents = $scope.allNewEvents.filter(e => e.start_time > now);
    }

    $scope.showRecurringWarning = ($scope.newEvents.find(e => e.asterisk) !== undefined);
  };

  $scope.save = function () {
    $modalInstance.close($scope.newEvents);
    reset();
  };

  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  };
}).directive('mlFileInputOnChange', function () {
  return {
    restrict: 'A',
    link: function (scope, element, attrs) {
      const onChangeHandler = scope.$eval(attrs.mlFileInputOnChange);
      element.on('change', onChangeHandler);
      element.on('$destroy', () => {
        element.off();
      });

    }
  };
});
