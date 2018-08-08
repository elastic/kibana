/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import 'plugins/ml/settings/scheduled_events/components/new_event_modal';
import 'plugins/ml/settings/scheduled_events/components/import_events_modal';

import template from './events_list.html';
import moment from 'moment';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('mlEventsList', function (
  $filter,
  pagerFactory,
  mlNewEventService,
  mlImportEventsService,
  config) {
  return {
    restrict: 'AE',
    replace: true,
    transclude: true,
    template,
    scope: {
      events: '=',
      showControls: '=',
      lockControls: '=',
      asteriskText: '='
    },
    controller: function ($scope) {

      $scope.pageOfEvents = [];     // Current page of events displayed in the list.
      $scope.dateFormatTz = config.get('dateFormat:tz');

      const TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
      const PAGE_SIZE = 20;

      // Create objects for sorting and paging through the events.
      const orderBy = $filter('orderBy');
      const limitTo = $filter('limitTo');
      $scope.pager = pagerFactory.create($scope.events.length, PAGE_SIZE, 1);
      $scope.sortField = 'description';
      $scope.sortReverse = false;

      $scope.onSortChange = function (field, reverse) {
        $scope.sortField = field;
        $scope.sortReverse = reverse;
      };

      $scope.onPageNext = function () {
        $scope.pager.nextPage();
      };

      $scope.onPagePrevious = function () {
        $scope.pager.previousPage();
      };

      $scope.$watchMulti([
        'events',
        'sortField',
        'sortReverse',
        'pager.currentPage'
      ], applyTableSettings);

      $scope.clickNewEvent = function () {
        mlNewEventService.openNewEventWindow()
          .then((event) => {
            $scope.events.push(event);
            applyTableSettings();
          })
          .catch(() => {});
      };

      $scope.formatTime = function (timeMs) {
        const time = moment(timeMs);
        return time.format(TIME_FORMAT);
      };

      $scope.deleteEvent = function (eventToDelete) {
        $scope.events.splice($scope.events.indexOf(eventToDelete), 1);
        applyTableSettings();
      };

      $scope.clickImportEvents = function () {
        mlImportEventsService.openImportEventsWindow()
          .then((events) => {
            $scope.events.push(...events);
            applyTableSettings();
          })
          .catch(() => {});
      };

      function applyTableSettings() {
        // Apply sorting and paging to the complete list of events.
        const pageOfEvents = orderBy($scope.events, $scope.sortField, $scope.sortReverse);
        $scope.pageOfEvents = limitTo(pageOfEvents, $scope.pager.pageSize, $scope.pager.startIndex);
        $scope.pager.setTotalItems($scope.events.length);
      }

    }
  };
});
