/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import { i18n } from '@kbn/i18n';
import template from './threshold_watch_agg_field.html';
import { ThresholdWatchBaseController } from '../threshold_watch_base';
import 'plugins/watcher/services/html_id_generator';
import 'plugins/watcher/components/xpack_aria_describes';

const app = uiModules.get('xpack/watcher');

app.directive('thresholdWatchAggField', function ($injector) {
  const htmlIdGeneratorFactory = $injector.get('xpackWatcherHtmlIdGeneratorFactory');

  return {
    restrict: 'E',
    template: template,
    scope: {
      itemId: '@',
      aggFields: '=',
      aggField: '=',
      isOpen: '=',
      isVisible: '=',
      onOpen: '=',
      onClose: '=',
      onChange: '=',
      onValid: '=',
      onInvalid: '=',
      onDirty: '=',
      onPristine: '='
    },
    bindToController: true,
    controllerAs: 'thresholdWatchAggField',
    controller: class ThresholdWatchAggFieldController extends ThresholdWatchBaseController {
      initAfterBindings($scope) {
        this.makeId = htmlIdGeneratorFactory.create();

        $scope.$watch('thresholdWatchAggField.aggField', this.onChange);

        $scope.$watch('thresholdWatchAggField.form.$valid', this.checkValidity);
        $scope.$watch('thresholdWatchAggField.form.$dirty', this.checkDirty);

        $scope.$watch('thresholdWatchAggField.isVisible', (isVisible, wasVisible) => {
          this.checkValidity();
          if (!isVisible && wasVisible) {
            this.resetForm();
            this.checkDirty();
          }
        });

        this.itemDescription = i18n.translate('xpack.watcher.thresholdWatchExpression.aggField.itemDescription', {
          defaultMessage: 'Of',
        });
      }

      get itemValue() {
        return this.aggField ? this.aggField.name : i18n.translate(
          'xpack.watcher.thresholdWatchExpression.aggField.selectFieldTextMessage', {
            defaultMessage: 'select a field',
          });
      }
    }
  };
});
