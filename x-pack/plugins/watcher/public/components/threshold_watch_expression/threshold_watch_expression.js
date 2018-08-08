/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { find, filter, includes, forEach, every, some } from 'lodash';
import { uiModules } from 'ui/modules';
import template from './threshold_watch_expression.html';
import './components/threshold_watch_agg_type';
import './components/threshold_watch_agg_field';
import './components/threshold_watch_group_by';
import './components/threshold_watch_threshold_level';
import './components/threshold_watch_time_window';
import 'plugins/watcher/components/expression_builder';
import './threshold_watch_expression.less';
import { aggTypes } from './lib/agg_types';
import { comparators } from './lib/comparators';
import { groupByTypes } from './lib/group_by_types';
import { TIME_UNITS } from 'plugins/watcher/constants';

const app = uiModules.get('xpack/watcher');

app.directive('thresholdWatchExpression', function () {

  return {
    restrict: 'E',
    template: template,
    scope: {
      thresholdWatch: '=',
      fields: '=',
      onChange: '=',
      onValid: '=',
      onInvalid: '=',
      onDirty: '='
    },
    bindToController: true,
    controllerAs: 'thresholdWatchExpression',
    controller: class ThresholdWatchExpressionController {
      constructor($scope) {
        this.items = {
          'agg-type': { isOpen: false, isVisible: true, isValid: true },
          'agg-field': { isOpen: false, isVisible: false, isValid: true },
          'group-by': { isOpen: false, isVisible: true, isValid: true },
          'threshold-level': { isOpen: false, isVisible: true, isValid: true },
          'time-window': { isOpen: false, isVisible: true, isValid: true }
        };

        this.aggTypes = aggTypes;
        this.groupByTypes = groupByTypes;
        this.comparators = comparators;
        this.timeUnits = TIME_UNITS;
        this.initialized = false;
        this.dirty = false;

        $scope.$watchGroup([
          'thresholdWatchExpression.thresholdWatch',
          'thresholdWatchExpression.fields'
        ], ([thresholdWatch, fields]) => {
          if (!thresholdWatch || !fields) {
            return;
          }

          this.aggType = find(this.aggTypes, { value: this.thresholdWatch.aggType });
          this.aggField = find(this.fields, { name: this.thresholdWatch.aggField });
          this.groupByType = this.thresholdWatch.termField ? this.groupByTypes.top : this.groupByTypes.all;
          this.termSize = this.thresholdWatch.termSize;
          this.termField = find(this.fields, { name: this.thresholdWatch.termField });
          this.threshold = this.thresholdWatch.threshold;
          this.thresholdComparator = find(this.comparators, { value: this.thresholdWatch.thresholdComparator });
          this.timeWindowSize = this.thresholdWatch.timeWindowSize;
          this.timeWindowUnit = this.thresholdWatch.timeWindowUnit;

          this.initialized = true;
        });
      }

      onAggTypeChange = (aggType) => {
        if (!this.initialized) {
          return;
        }

        this.aggType = aggType;

        if (aggType.fieldRequired) {
          this.items['agg-field'].isVisible = true;
          this.aggFields = filter(
            this.fields, field => includes(aggType.validNormalizedTypes, field.normalizedType)
          );
          // The selected aggField may no longer be in the new array of aggFields. If so,
          // unset it via the handler, so additional business logic is fired.
          if (!includes(this.aggFields, this.aggField)) {
            this.onAggFieldChange(null);
          }
        } else {
          this.items['agg-field'].isVisible = false;
          this.onAggFieldChange(null);
        }

        this.thresholdWatch.aggType = aggType ? aggType.value : null;

        this.onChange(this.thresholdWatch);
      };

      onAggFieldChange = (aggField) => {
        if (!this.initialized) {
          return;
        }

        this.aggField = aggField;
        this.thresholdWatch.aggField = aggField ? aggField.name : null;

        this.onChange(this.thresholdWatch);
      }

      onGroupByChange = ([groupByType, termSize, termField], [oldGroupByType]) => {
        if (!this.initialized) {
          return;
        }

        this.groupByType = groupByType;
        this.termSize = termSize;
        this.termField = termField;

        if (groupByType !== oldGroupByType) {
          this.termFields = filter(
            this.fields, field => includes(this.groupByType.validNormalizedTypes, field.normalizedType)
          );

          if (Boolean(oldGroupByType)) {
            if (this.groupByType === this.groupByTypes.all) {
              this.termSize = null;
              this.termField = null;
            } else {
              this.termSize = this.thresholdWatch.DEFAULT_VALUES.TERM_SIZE;
            }
          }
        }

        this.thresholdWatch.termSize = this.termSize;
        this.thresholdWatch.termField = this.termField ? this.termField.name : null;

        this.onChange(this.thresholdWatch);
      }

      onThresholdLevelChange = ([thresholdComparator, threshold]) => {
        if (!this.initialized) {
          return;
        }

        this.thresholdComparator = thresholdComparator;
        this.threshold = threshold;

        this.thresholdWatch.thresholdComparator = this.thresholdComparator.value;
        this.thresholdWatch.threshold = this.threshold;

        this.onChange(this.thresholdWatch);
      }

      onTimeWindowChange = ([timeWindowSize, timeWindowUnit]) => {
        if (!this.initialized) {
          return;
        }

        this.timeWindowSize = timeWindowSize;
        this.timeWindowUnit = timeWindowUnit;

        this.thresholdWatch.timeWindowSize = this.timeWindowSize;
        this.thresholdWatch.timeWindowUnit = this.timeWindowUnit;

        this.onChange(this.thresholdWatch);
      }

      isItemVisible = (itemId) => {
        return this.items[itemId].isVisible;
      }

      isItemOpen = (itemId) => {
        return this.items[itemId].isOpen;
      }

      onItemOpen = (itemId) => {
        forEach(this.items, (item, id) => {
          item.isOpen = (itemId === id);
        });
      }

      onItemClose = (itemId) => {
        this.items[itemId].isOpen = false;
      }

      isExpressionValid = () => {
        return every(this.items, item => item.isValid || !item.isVisible);
      }

      showExpressionValidation = () => {
        return some(this.items, item => !item.isValid && item.isVisible && item.isDirty);
      }

      checkValidity = () => {
        if (this.isExpressionValid()) {
          this.onValid();
        } else {
          this.onInvalid();
        }
      }

      onItemValid = (itemId) => {
        this.items[itemId].isValid = true;

        this.checkValidity();
      }

      onItemInvalid = (itemId) => {
        this.items[itemId].isValid = false;

        this.checkValidity();
      }

      onItemDirty = (itemId) => {
        this.items[itemId].isDirty = true;
      }

      onItemPristine = (itemId) => {
        this.items[itemId].isDirty = false;
      }
    }
  };
});
