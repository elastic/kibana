/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../../directives/moment';
import { uiModules } from 'ui/modules';
import 'ui/pager_control';
import 'ui/pager';
import 'ui/table_info';
import { InitAfterBindingsWorkaround } from 'ui/compat';

import { PAGINATION } from 'plugins/watcher/../common/constants';

import template from './watch_history.html';
import '../watch_history_table';
import '../watch_history_range_filter';

const app = uiModules.get('xpack/watcher');

app.directive('watchHistory', function ($injector) {
  const pagerFactory = $injector.get('pagerFactory');

  const $filter = $injector.get('$filter');
  const orderBy = $filter('orderBy');
  const limitTo = $filter('limitTo');

  return {
    restrict: 'E',
    replace: true,
    template: template,
    scope: {
      watch: '=xpackWatch', // Property names differ due to https://git.io/vSWXV
      historyItems: '=',
      initialRange: '=',
      onRangeChange: '=',
      isLoading: '=',
    },
    bindToController: true,
    controllerAs: 'watchHistory',
    controller: class WatchHistoryController extends InitAfterBindingsWorkaround {
      initAfterBindings($scope) {
        this.isLoading = false;
        this.sortField = 'startTime';
        this.sortReverse = true;
        this.pageOfHistoryItems = [];

        this.historyRange = this.initialRange;
        this.pager = pagerFactory.create(this.historyItems.length, PAGINATION.PAGE_SIZE, 1);

        // react to data and UI changes
        $scope.$watchMulti([
          'watchHistory.historyItems',
          'watchHistory.sortField',
          'watchHistory.sortReverse',
          'watchHistory.pager.currentPage',
        ], this.applyFilters);
      }

      get hasPageOfHistoryItems() {
        return this.pageOfHistoryItems.length > 0;
      }

      onPageNext = () => {
        this.pager.nextPage();
      };

      onPagePrevious = () => {
        this.pager.previousPage();
      };

      onSortChange = (field, reverse) => {
        this.sortField = field;
        this.sortReverse = reverse;
      };

      applyFilters = () => {
        const orderedHistoryItems = orderBy(this.historyItems, this.sortField, this.sortReverse);
        this.pageOfHistoryItems = limitTo(orderedHistoryItems, this.pager.pageSize, this.pager.startIndex);
        this.pager.setTotalItems(orderedHistoryItems.length);
      };
    }
  };
});
