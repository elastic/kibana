/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sortBy, pluck, map, startsWith, endsWith } from 'lodash';
import 'plugins/watcher/services/indices';
import { InitAfterBindingsWorkaround } from 'ui/compat';
import { uiModules } from 'ui/modules';
import template from './index_select.html';

import './index_select.less';

function mapIndex(indexName, isFromIndexPattern = false, isUserEntered = false) {
  return { indexName, isFromIndexPattern, isUserEntered };
}

function collapseIndices(allIndices, allIndexPatterns) {
  const indices = map(allIndices, indexName => mapIndex(indexName, false));
  const indexPatterns = map(allIndexPatterns, indexName => mapIndex(indexName, true));
  indices.push(...indexPatterns);
  return indices;
}

const INDICES_FROM_INDEX_PATTERNS_HEADER_COPY = 'Based on your index patterns';
const INDICES_FOR_CREATION_HEADER_COPY = 'Choose...';
const INDICES_FROM_INDICES_HEADER_COPY = 'Based on your indices and aliases';

const app = uiModules.get('xpack/watcher');

app.directive('indexSelect', ($injector) => {
  const indicesService = $injector.get('xpackWatcherIndicesService');
  const indexPatternsService = $injector.get('indexPatterns');
  const $timeout = $injector.get('$timeout');

  return {
    restrict: 'E',
    template,
    scope: {
      index: '=',
      onChange: '=',
      onTouched: '='
    },
    controllerAs: 'indexSelect',
    bindToController: true,
    link: ($scope, $ele) => {
      const $searchBox = $ele.find('input[type="search"]');
      $scope.indexSelect.$searchBox = $searchBox;

      $searchBox.attr('id', 'indexSelectSearchBox');
    },
    controller: class IndexSelectController extends InitAfterBindingsWorkaround {
      initAfterBindings($scope) {
        this.$scope = $scope;
        this.indexPattern = undefined;
        this.fetchingWithNoIndices = true;
        this.selectedIndices = [];
        this.fetchedIndices = [];

        if (Boolean(this.index)) {
          if (Array.isArray(this.index)) {
            this.selectedIndices.push(...this.index.map(mapIndex));
          } else {
            this.selectedIndices.push(mapIndex(this.index));
          }
        }

        if (this.onTouched) {
          $timeout(() => {
            this.$searchBox.on('blur', () => {
              $scope.$apply(this.onTouched);
            });
          });
          $scope.$on('$destroy', () => {
            this.$searchBox.off('blur');
          });
        }

        $scope.$watch('indexSelect.index', () => {
          $timeout(() => {
            // Hack that forces the ui-select to resize itself
            $scope.$$childHead.$select.sizeSearchInput();
          }, 100);
        });
      }

      get hasIndexPattern() {
        return Boolean(this.indexPattern);
      }

      /**
       * This method powers the `on-select` and `on-remove` within ui-select
       * to handle when an index is added or removed from the list
       */
      onIndicesChanged() {
        const indexNames = pluck(this.selectedIndices, 'indexName');
        this.onChange(indexNames);
      }

      /**
       * This method powers the `tagging` within ui-select to format
       * a search query that has no results into a valid result so it
       * can be selected
       *
       * @param {object} item
       */
      onNewItem(unmatchedIndexPattern) {
        return mapIndex(unmatchedIndexPattern);
      }

      /**
       * This method powers the `group-by` within ui-select to group
       * our indices array based on the souce
       *
       * @param {object} index
       */
      groupIndices(index) {
        if (index.isFromIndexPattern) {
          return INDICES_FROM_INDEX_PATTERNS_HEADER_COPY;
        }

        if (index.isUserEntered) {
          return INDICES_FOR_CREATION_HEADER_COPY;
        }

        return INDICES_FROM_INDICES_HEADER_COPY;
      }

      /**
       * This method powers the `group-filter` within ui-select to allow
       * us to sort the grouped object so we can control which group
       * is shown first
       *
       * @param {object} grouped
       */
      sortGroupedIndices(grouped) {
        return sortBy(grouped, group => group.name);
      }

      /**
       * This method powers the `uis-open-close` within ui-select to ensure
       * we reset the search state once the dropdown is closed. The default
       * behavior of ui-select is to clear the input field when the dropdown
       * is closed and if we fail to reset the search state at the same time
       * it will lead to a poor UX.
       *
       * @param {bool} isOpen
       */
      onDropdownToggled(isOpen) {
        if (!isOpen) {
          this.reset();
        }
      }

      /**
       * Resets the search state so we have no stored query or results
       */
      reset() {
        this.fetchedIndices.length = 0;
        this.indexPattern = undefined;
      }

      /**
       * This powers the `refresh` within ui-select which is called
       * as a way to async fetch results based on the typed in query
       *
       * @param {string} indexPattern
       */
      fetchIndices(indexPattern) {
        if (!Boolean(indexPattern)) {
          this.reset();
          return;
        }

        // Store this so we can display it if there are no matches
        this.indexPattern = indexPattern;

        let pattern = indexPattern;

        // Use wildcards religiously to ensure partial matches
        if (!endsWith(pattern, '*')) {
          pattern += '*';
        }
        if (!startsWith(pattern, '*')) {
          pattern = '*' + pattern;
        }

        const promises = [
          indicesService.getMatchingIndices(pattern),
          indexPatternsService.getTitles()
        ];

        if (this.fetchedIndices.length === 0) {
          this.fetchingWithNoIndices = true;
        }

        Promise.all(promises)
          .then(([allIndices, allIndexPatterns]) => {
            const indices = collapseIndices(allIndices, allIndexPatterns);
            this.fetchedIndices = sortBy(indices, 'indexName');
            this.fetchedIndices.push(mapIndex(this.indexPattern, false, true));
            this.fetchingWithNoIndices = false;
            this.$scope.$apply();
          });
      }
    }
  };
});
