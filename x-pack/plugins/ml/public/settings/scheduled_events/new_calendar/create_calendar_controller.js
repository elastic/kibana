/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import $ from   'jquery';
import _ from 'lodash';

import 'plugins/ml/components/item_select';
import 'plugins/ml/settings/scheduled_events/components/events_list';

import { validateCalendarId } from 'plugins/ml/settings/scheduled_events/components/utils/validate_calendar';

import uiRoutes from 'ui/routes';
import { checkLicense } from 'plugins/ml/license/check_license';
import { checkGetJobsPrivilege } from 'plugins/ml/privilege/check_privilege';
import { checkMlNodesAvailable } from 'plugins/ml/ml_nodes_check/check_ml_nodes';

import template from './create_calendar.html';

uiRoutes
  .when('/settings/calendars_list/new_calendar', {
    template,
    resolve: {
      CheckLicense: checkLicense,
      privileges: checkGetJobsPrivilege,
      checkMlNodesAvailable
    }
  })
  .when('/settings/calendars_list/edit_calendar/:calendarId', {
    template,
    resolve: {
      CheckLicense: checkLicense,
      privileges: checkGetJobsPrivilege,
      checkMlNodesAvailable
    }
  });

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml', ['ui.bootstrap']);

module.controller('MlCreateCalendar',
  function (
    $scope,
    $route,
    $location,
    ml,
    timefilter,
    mlMessageBarService,
    mlJobService,
    mlCalendarService) {
    const msgs = mlMessageBarService;
    msgs.clear();

    const calendarId = $route.current.params.calendarId;
    $scope.isNewCalendar = (calendarId === undefined);

    $scope.pageTitle = $scope.isNewCalendar ? 'Create new calendar' : `Edit calendar ${calendarId}`;

    $scope.calendarId = calendarId || '';
    $scope.description = '';
    $scope.events = [];
    $scope.jobIds = [];
    $scope.allJobs = [];
    $scope.groupIds = [];
    $scope.allGroups = [];
    $scope.updateJobsList = {};
    $scope.updateGroupsList = {};
    $scope.saveLock = false;
    $scope.validation = {
      checks: {
        calendarId: { valid: true },
      }
    };

    mlJobService.loadJobs()
      .then(() => {
        const jobs = mlJobService.jobs;
        $scope.allJobs = jobs.map(j => ({ id: j.job_id }));
        $scope.allGroups = mlJobService.getJobGroups().map(g => ({ id: g.id }));

        mlCalendarService.loadCalendars(jobs)
          .then((resp) => {
            const calendars = resp.calendars;
            const calGroups = mlCalendarService.getCalendarGroups();
            // append calendar groups to the list of all groups and deduplicate
            $scope.allGroups.push(...calGroups);
            $scope.allGroups = _.uniq($scope.allGroups, 'id');
            $scope.allGroups = _.sortBy($scope.allGroups, 'id');

            calendars.forEach((calendar) => {
              // if we're editing an existing calendar
              if (calendarId !== undefined && calendarId === calendar.calendar_id) {
                $scope.events = calendar.events || [];
                $scope.description = calendar.description || '';

                calendar.job_ids.forEach(id => {
                  if ($scope.allJobs.find((j) => j.id === id)) {
                    // if the job exists, add it to the job list
                    $scope.jobIds.push(id);
                  } else if ($scope.allGroups.find((g) => g.id === id)) {
                    // otherwise, it could be a group,
                    // if it exists as a group, add it to the group list
                    $scope.groupIds.push(id);
                  }
                });
              }
            });

            $scope.updateJobsList.update($scope.jobIds);
            $scope.updateGroupsList.update($scope.groupIds);
          });
        $('.new-calendar-container #id').focus();
      });

    $scope.save = function () {
      msgs.clear();
      // Just pass the three event properties used by the endpoint, ignoring UI-specific properties
      // such as 'asterisk' which is used to flag recurring events from an ICS file import.
      const events = $scope.events.map((event) => {
        return {
          description: event.description,
          start_time: event.start_time,
          end_time: event.end_time
        };
      });

      const calendar = {
        calendarId: $scope.calendarId,
        description: $scope.description,
        events,
        job_ids: [...$scope.jobIds, ...$scope.groupIds],
      };

      if (validateCalendarId(calendar.calendarId, $scope.validation.checks)) {
        $scope.saveLock = true;
        const saveFunc = $scope.isNewCalendar ? ml.addCalendar : ml.updateCalendar;
        saveFunc(calendar)
          .then(() => {
            $location.path('settings/calendars_list');
            $scope.saveLock = false;
          })
          .catch((error) => {
            msgs.error('Save calendar failed: ', error);
            $scope.saveLock = false;
          });
      }
    };

    $scope.cancel = function () {
      $location.path('settings/calendars_list');
    };

    $scope.saveEnabled = function () {
      return ($scope.calendarId !== '' && $scope.calendarId !== undefined && $scope.saveLock === false);
    };

  });
