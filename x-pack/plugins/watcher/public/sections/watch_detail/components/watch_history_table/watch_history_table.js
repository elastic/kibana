/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../../directives/moment';
import { uiModules } from 'ui/modules';
import template from './watch_history_table.html';
import 'plugins/watcher/components/watch_state_icon';
import { find, isEmpty } from 'lodash';
import { LISTS } from 'plugins/watcher/../common/constants';

const app = uiModules.get('xpack/watcher');

app.directive('watchHistoryTable', function ($injector) {
  const $timeout = $injector.get('$timeout');

  return {
    restrict: 'E',
    replace: true,
    template: template,
    scope: {
      watch: '=xpackWatch', // Property names differ due to https://git.io/vSWXV
      historyItems: '=',
      sortField: '=',
      sortReverse: '=',
      onSortChange: '='
    },
    bindToController: true,
    controllerAs: 'watchHistoryTable',
    controller: class WatchHistoryTableController {
      constructor($scope) {
        $scope.$watch('watchHistoryTable.historyItems', historyItems => {
          const previousItems = this.items;
          const isInitialLoad = isEmpty(previousItems);

          this.items = historyItems.map(historyItem => {
            const matchedItem = find(previousItems, previousItem => previousItem.historyItem.id === historyItem.id);
            const isNew = !isInitialLoad && Boolean(!matchedItem);
            return { historyItem, isNew };
          });

          $timeout(() => {
            this.items.forEach(item => {
              item.isNew = false;
            });
          }, LISTS.NEW_ITEMS_HIGHLIGHT_DURATION);
        });
      }
    }
  };
});
