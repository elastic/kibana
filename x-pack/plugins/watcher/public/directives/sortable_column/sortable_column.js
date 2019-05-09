/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { uiModules } from 'ui/modules';
import { i18n } from '@kbn/i18n';
import template from './sortable_column.html';

const app = uiModules.get('xpack/watcher');

app.directive('sortableColumn', function () {
  return {
    restrict: 'E',
    transclude: true,
    template: template,
    scope: {
      field: '@',
      sortField: '=',
      sortReverse: '=',
      onSortChange: '=',
    },
    controllerAs: 'sortableColumn',
    bindToController: true,
    controller: class SortableColumnController {
      toggle = () => {
        if (this.sortField === this.field) {
          this.onSortChange(this.field, !this.sortReverse);
        } else {
          this.onSortChange(this.field, false);
        }
      }

      getAriaLabel() {
        const isAscending = this.isSortedAscending();
        if(isAscending) {
          return i18n.translate('xpack.watcher.sortableColumn.sortAscendingAriaLabel', {
            defaultMessage: 'Sort {field} ascending',
            values: { field: this.field },
          });
        }
        return i18n.translate('xpack.watcher.sortableColumn.sortDescendingAriaLabel', {
          defaultMessage: 'Sort {field} descending',
          values: { field: this.field },
        });
      }

      isSorted() {
        return this.sortField === this.field;
      }

      isSortedAscending() {
        return this.isSorted() && !this.sortReverse;
      }

      isSortedDescending() {
        return this.isSorted() && this.sortReverse;
      }
    }
  };
});
