/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



// copy of Kibana's ui/public/paginated_table/paginated_table.js
// but with the one-time binding removed from the scope columns object
// in the paginated_table.html template, to allow dynamic changes to
// the list of columns shown in the table.

import './row';

import './styles/main.less';
import 'ui/directives/paginate';
import 'ui/styles/pagination.less';
import _ from 'lodash';
import template from './paginated_table.html';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('mlPaginatedTable', function ($filter) {
  const orderBy = $filter('orderBy');

  return {
    restrict: 'E',
    template,
    transclude: true,
    scope: {
      rows: '=',
      columns: '=',
      perPage: '=?',
      sortHandler: '=?',
      showSelector: '=?'
    },
    controllerAs: 'mlPaginatedTable',
    controller: function ($scope) {
      const self = this;
      self.sort = {
        columnIndex: null,
        direction: null
      };

      self.sortColumn = function (colIndex) {
        const col = $scope.columns[colIndex];

        if (!col) return;
        if (col.sortable === false) return;

        let sortDirection;

        if (self.sort.columnIndex !== colIndex) {
          sortDirection = 'asc';
        } else {
          const directions = {
            null: 'asc',
            'asc': 'desc',
            'desc': null
          };
          sortDirection = directions[self.sort.direction];
        }

        self.sort.columnIndex = colIndex;
        self.sort.direction = sortDirection;
        self._setSortGetter(colIndex);
      };

      self._setSortGetter = function (index) {
        if (_.isFunction($scope.sortHandler)) {
          // use custom sort handler
          self.sort.getter = $scope.sortHandler(index);
        } else {
          // use generic sort handler
          self.sort.getter = function (row) {
            const value = row[index];
            if (value && value.value !== undefined && value.value !== null) {
              if (typeof value.value === 'function') {
                return value.value();
              } else {
                return value.value;
              }
            } else {
              return value;
            }
          };
        }
      };

      // update the sortedRows result
      $scope.$watchMulti([
        'rows',
        'columns',
        '[]mlPaginatedTable.sort'
      ], function resortRows() {
        if (!$scope.rows || !$scope.columns) {
          $scope.sortedRows = false;
          return;
        }

        const sort = self.sort;
        if (sort.direction == null) {
          $scope.sortedRows = $scope.rows.slice(0);
        } else {
          $scope.sortedRows = orderBy($scope.rows, sort.getter, sort.direction === 'desc');
        }
      });
    }
  };
});
