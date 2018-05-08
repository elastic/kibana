/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



// copy of ui/public/directives/row.js
// overridden to add the option for row expansion.

import $ from 'jquery';
import _ from 'lodash';
import AggConfigResult from 'ui/vis/agg_config_result';
import { FilterBarClickHandlerProvider } from 'ui/filter_bar/filter_bar_click_handler';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('mlRows', function ($compile, getAppState, Private) {
  const filterBarClickHandler = Private(FilterBarClickHandlerProvider);
  return {
    restrict: 'A',

    link: function ($scope, $el, attr) {
      function addCell($tr, contents) {
        let $cell = $(document.createElement('td'));

        // TODO: It would be better to actually check the type of the field, but we don't have
        // access to it here. This may become a problem with the switch to BigNumber
        if (_.isNumber(contents)) {
          $cell.addClass('numeric-value');
        }

        const createAggConfigResultCell = function (aggConfigResult) {
          const $resultCell = $(document.createElement('td'));
          const $state = getAppState();
          const clickHandler = filterBarClickHandler($state);
          $resultCell.scope = $scope.$new();
          $resultCell.addClass('cell-hover');
          $resultCell.attr('ng-click', 'clickHandler($event)');
          $resultCell.scope.clickHandler = function (event) {
            if ($(event.target).is('a')) return; // Don't add filter if a link was clicked
            clickHandler({ point: { aggConfigResult: aggConfigResult } });
          };
          return $compile($resultCell)($cell.scope);
        };

        if (contents instanceof AggConfigResult) {
          if (contents.type === 'bucket' && contents.aggConfig.field() && contents.aggConfig.field().filterable) {
            $cell = createAggConfigResultCell(contents);
          }
          contents = contents.toString('html');
        }

        if (_.isObject(contents)) {
          if (contents.attr) {
            $cell.attr(contents.attr);
          }

          if (contents.class) {
            $cell.addClass(contents.class);
          }

          if (contents.scope) {
            $cell = $compile($cell.html(contents.markup))(contents.scope);
          } else {
            $cell.html(contents.markup);
          }
        } else {
          if (contents === '') {
            $cell.html('&nbsp;');
          } else {
            $cell.html(contents);
          }
        }

        $tr.append($cell);
      }

      $scope.$watchMulti([
        attr.mlRows,
        attr.mlRowsMin
      ], function (vals) {
        let rows = vals[0];
        const min = vals[1];

        $el.empty();

        if (!_.isArray(rows)) {
          rows = [];
        }

        if (isFinite(min) && rows.length < min) {
          // clone the rows so that we can add elements to it without upsetting the original
          rows = _.clone(rows);
        }

        rows.forEach(function (row) {
          if (row.length) {
            const rowScope = row[0].scope;
            const $tr = $(document.createElement('tr')).appendTo($el);

            if (rowScope &&
                rowScope.mouseenterRow !== undefined && typeof rowScope.mouseenterRow === 'function') {
              // Add mousenter and mouseleave events to the row
              $tr.attr({ 'ng-mouseenter': 'mouseenterRow($event)' });
              $tr.attr({ 'ng-mouseleave': 'mouseleaveRow($event)' });
              $compile($tr)(rowScope);
            }

            row.forEach(function (cell) {
              addCell($tr, cell);
            });

            if (rowScope &&
                rowScope.expandable &&
                rowScope.expandElement && // the tag name of the element which contains the expanded row's contents
                row.join('') !== '') {    // empty rows are passed in as an array of empty cols, ie ['','','']

              if (rowScope.open === undefined) {
                rowScope.open = false;
              }

              if (rowScope.rowInitialised === undefined) {
                rowScope.rowInitialised = false;
              }

              rowScope.toggleRow = function () {
                this.open = !this.open;
                if (this.initRow && this.rowInitialised === false) {
                  this.rowInitialised = true;
                  this.initRow();
                }
              };

              const $trExpand = $(document.createElement('tr')).appendTo($el);
              $trExpand.attr('ng-show', 'open');
              $trExpand.addClass('row-expand');

              const $td = $(document.createElement('td')).appendTo($trExpand);
              $td.attr('colspan', row.length);

              const expEl = rowScope.expandElement;
              const $exp = $(document.createElement(expEl)).appendTo($td);

              // if expand element already exits and has child elements,
              // copy them to the new expand element
              if (rowScope.$expandElement && rowScope.$expandElement.children().length) {
                $exp.append(rowScope.$expandElement.children()[0]);
              }

              $compile($trExpand)(rowScope);
              rowScope.$expandElement = $exp;
            }

          }
        });
      });
    }
  };
});
