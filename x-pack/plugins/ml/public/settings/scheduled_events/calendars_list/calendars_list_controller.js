/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import _ from 'lodash';

import 'ui/pager_control';
import 'ui/pager';
import 'ui/sortable_column';

import uiRoutes from 'ui/routes';
import { checkLicense } from 'plugins/ml/license/check_license';
import { checkGetJobsPrivilege, permissionCheckProvider } from 'plugins/ml/privilege/check_privilege';
import { getMlNodeCount, mlNodesAvailable } from 'plugins/ml/ml_nodes_check/check_ml_nodes';
import { buttonsEnabledChecks } from 'plugins/ml/settings/scheduled_events/calendars_list/buttons_enabled_checks';

import template from './calendars_list.html';

uiRoutes
  .when('/settings/calendars_list', {
    template,
    resolve: {
      CheckLicense: checkLicense,
      privileges: checkGetJobsPrivilege,
      mlNodeCount: getMlNodeCount
    }
  });

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml', ['ui.bootstrap']);

module.controller('MlCalendarsList',
  function (
    $scope,
    $filter,
    $route,
    $location,
    pagerFactory,
    Private,
    ml,
    timefilter,
    mlConfirmModalService) {

    const { checkPermission, createPermissionFailureMessage } = Private(permissionCheckProvider);
    $scope.permissions = {
      canCreateCalendar: checkPermission('canCreateCalendar'),
      canDeleteCalendar: checkPermission('canDeleteCalendar'),
    };

    timefilter.disableTimeRangeSelector(); // remove time picker from top of page
    timefilter.disableAutoRefreshSelector(); // remove time picker from top of page
    const mlConfirm = mlConfirmModalService;

    let calendars = [];                // Complete list of calendars received from the ML endpoint.
    $scope.displayCalendars = [];      // List of calendars being displayed after filtering and sorting.
    $scope.buttonChecks = buttonsEnabledChecks($scope.permissions, createPermissionFailureMessage, mlNodesAvailable());

    // Create a pager object to page through long lists of calendars.
    const PAGE_SIZE = 20;
    const limitTo = $filter('limitTo');
    $scope.pager = pagerFactory.create(0, PAGE_SIZE, 1);

    // Sort field labels, to identify column used for sorting the list.
    const SORT_FIELD_LABELS = {
      CALENDAR_ID: 'calendar_id',
      JOB_IDS: 'job_ids',
      EVENT_COUNT: 'event_count'
    };
    $scope.SORT_FIELD_LABELS = SORT_FIELD_LABELS;
    $scope.sortField = SORT_FIELD_LABELS.CALENDAR_ID;
    $scope.sortReverse = false;

    $scope.onSortChange = function (field, reverse) {
      $scope.sortField = field;
      $scope.sortReverse = reverse;
    };

    // Listen for changes to the search text and build Regexp.
    $scope.onQueryChange = function (query) {
      if (query) {
        $scope.filterRegexp = new RegExp(`(${query})`, 'gi');
      } else {
        $scope.filterRegexp = undefined;
      }
    };

    $scope.onPageNext = function () {
      $scope.pager.nextPage();
    };

    $scope.onPagePrevious = function () {
      $scope.pager.previousPage();
    };

    $scope.$watchMulti([
      'sortField',
      'sortReverse',
      'filterRegexp',
      'pager.currentPage'
    ], applyTableSettings);

    $scope.newCalendarClick = function () {
      $location.path('settings/calendars_list/new_calendar');
    };

    $scope.editCalendarClick = function (id) {
      $location.path(`settings/calendars_list/edit_calendar/${id}`);
    };

    $scope.deleteCalendarClick = function (calendarId) {
      mlConfirm.open({
        message: `Confirm deletion of ${calendarId}?`,
        title: `Delete calendar`
      })
        .then(() => {
          ml.deleteCalendar({ calendarId })
            .then(loadCalendars)
            .catch((error) => {
              console.log(error);
            });
        })
        .catch(() => {});
    };

    function loadCalendars() {
      ml.calendars()
        .then((resp) => {
          calendars = resp;
          $scope.pager = pagerFactory.create(calendars.length, PAGE_SIZE, 1);
          applyTableSettings();
        });
    }

    function applyTableSettings() {
      // Applies the settings from the table controls (search filter and sorting).
      let filteredCalendars = _.filter(calendars, (calendar) => {
        // If search text has been entered, look for match in the calendar ID or job IDs.
        return $scope.filterRegexp === undefined ||
          calendar.calendar_id.match($scope.filterRegexp) ||
          calendar.job_ids.join(' ').match($scope.filterRegexp);
      });

      filteredCalendars = _.sortBy(filteredCalendars, (calendar) => {
        switch ($scope.sortField) {
          case SORT_FIELD_LABELS.JOB_IDS:
            return calendar.job_ids.join();
          case SORT_FIELD_LABELS.EVENT_COUNT:
            return calendar.events.length;
          case SORT_FIELD_LABELS.CALENDAR_ID:
          default:
            return calendar[$scope.sortField];
        }
      });
      if ($scope.sortReverse === true) {
        filteredCalendars = filteredCalendars.reverse();
      }

      $scope.displayCalendars = limitTo(filteredCalendars, $scope.pager.pageSize, $scope.pager.startIndex);
      $scope.pager.setTotalItems(filteredCalendars.length);
    }

    loadCalendars();
  });
