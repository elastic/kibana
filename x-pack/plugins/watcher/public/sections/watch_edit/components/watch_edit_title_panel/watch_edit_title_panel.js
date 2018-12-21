/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { size } from 'lodash';
import { uiModules } from 'ui/modules';
import { InitAfterBindingsWorkaround } from 'ui/compat';
import template from './watch_edit_title_panel.html';
import { TIME_UNITS } from 'plugins/watcher/../common/constants';

import 'plugins/watcher/components/index_select';
import 'plugins/watcher/components/duration_select';
import 'plugins/watcher/services/html_id_generator';
import 'plugins/watcher/components/xpack_aria_describes';

const app = uiModules.get('xpack/watcher');

const VALID_NORMALIZED_TYPES = ['date'];

app.directive('watchEditTitlePanel', function ($injector, i18n) {
  const htmlIdGeneratorFactory = $injector.get('xpackWatcherHtmlIdGeneratorFactory');

  return {
    restrict: 'E',
    template: template,
    replace: true,
    scope: {
      watch: '=xpackWatch', // Property names differ due to https://git.io/vSWXV
      fields: '=',
      onChange: '=',
      onInvalid: '=',
      onValid: '='
    },
    bindToController: true,
    controllerAs: 'watchEditTitlePanel',
    controller: class WatchEditTitlePanelController extends InitAfterBindingsWorkaround {
      initAfterBindings($scope) {
        this.makeId = htmlIdGeneratorFactory.create();

        this.triggerIntervalSize = this.watch.triggerIntervalSize;
        this.triggerIntervalUnit = this.watch.triggerIntervalUnit;

        this.triggerIntervalMinimumUnit = TIME_UNITS.SECOND;
        this.triggerIntervalMinimumSize = 10;

        this.timeFields = [];
        this.indexSelectTouched = false;

        $scope.$watch('watchEditTitlePanel.triggerIntervalSize', (newSize) => {
          this.watch.triggerIntervalSize = Number(newSize);
          this.onChange(this.watch);
        });

        $scope.$watch('watchEditTitlePanel.triggerIntervalUnit', (newUnit) => {
          this.watch.triggerIntervalUnit = newUnit;
          this.onChange(this.watch);
        });

        $scope.$watchMulti([
          'watchEditTitlePanel.watch.name',
          'watchEditTitlePanel.watch.timeField'
        ], () => {
          this.onChange(this.watch);
        });

        $scope.$watch('watchEditTitlePanel.watch.index', (newIndex) => {
          if (!Boolean(newIndex) || newIndex.length === 0) {
            this.watch.timeField = undefined;
            this.timeFields = [];
          }
        });

        $scope.$watchMulti([
          'watchEditTitlePanel.form.$valid',
          'watchEditTitlePanel.watch.index'
        ], this.updateValidity);

        $scope.$watch('watchEditTitlePanel.fields', (fields) => {
          this.timeFields = Boolean(fields)
            ? fields.filter(
              field => VALID_NORMALIZED_TYPES.includes(field.normalizedType)
            )
            : [];
          this.updateValidity();
        });
      }

      get title() {
        if (this.watch.isNew) {
          const typeName = this.watch.typeName.toLowerCase();
          return i18n('xpack.watcher.sections.watchEdit.titlePanel.createNewTypeOfWatchTitle', {
            defaultMessage: 'Create a new {typeName}',
            values: { typeName },
          });
        } else {
          return this.watch.name;
        }
      }

      get description() {
        return this.watch.titleDescription;
      }

      onIndexSelectTouched = () => {
        this.indexSelectTouched = true;
      }

      onIndexSelection = (indices) => {
        this.watch.index = indices;
        this.indexSelectTouched = true;
        this.updateValidity();
        this.onChange(this.watch);
      }

      updateValidity = () => {
        const isValid = this.form.$valid && this.hasAnyValidSelectedIndices();

        if (isValid) {
          this.onValid();
        } else {
          this.onInvalid();
        }
      }

      hasAnySelectedIndices = () => {
        if (Array.isArray(this.watch.index)) {
          return this.watch.index.length > 0;
        }
        return Boolean(this.watch.index);
      }

      hasAnyValidSelectedIndices = () => {
        return this.hasAnySelectedIndices()
          && Boolean(this.fields) && this.fields.length > 0;
      }

      isValidationMessageVisible = (fieldName, errorType, showIfOtherErrors = true) => {
        if (!this.form[fieldName]) {
          return false;
        }

        let showMessage = (this.form[fieldName].$touched || this.form[fieldName].$dirty) &&
          this.form[fieldName].$error[errorType];

        if (showMessage && !showIfOtherErrors && size(this.form[fieldName].$error) > 1) {
          showMessage = false;
        }

        return showMessage;
      }

      showIndexSelectionValidationState = () => {
        return !this.hasAnySelectedIndices()
          || this.showInvalidIndexValidationMessage()
          || this.showNoTimeFieldsValidationMessage();
      }

      showRequiredIndexSelectionValidationMessage = () => {
        return this.indexSelectTouched && !this.hasAnySelectedIndices();
      }

      showInvalidIndexValidationMessage = () => {
        return this.hasAnySelectedIndices()
          && Boolean(this.fields) && this.fields.length === 0;
      }

      showNoTimeFieldsValidationMessage = () => {
        return this.hasAnyValidSelectedIndices() && this.timeFields.length === 0;
      }
    }
  };
});
