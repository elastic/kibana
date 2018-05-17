/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import template from './threshold_watch_threshold_level.html';
import { ThresholdWatchBaseController } from '../threshold_watch_base';
const app = uiModules.get('xpack/watcher');
import 'plugins/watcher/services/html_id_generator';
import 'plugins/watcher/components/xpack_aria_describes';

app.directive('thresholdWatchThresholdLevel', function ($injector) {
  const htmlIdGeneratorFactory = $injector.get('xpackWatcherHtmlIdGeneratorFactory');

  return {
    restrict: 'E',
    template: template,
    scope: {
      itemId: '@',
      comparators: '=',
      thresholdComparator: '=',
      threshold: '=',
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
    controllerAs: 'thresholdWatchThresholdLevel',
    controller: class ThresholdWatchThresholdLevelController extends ThresholdWatchBaseController {
      initAfterBindings($scope) {
        this.makeId = htmlIdGeneratorFactory.create();

        $scope.$watchMulti([
          'thresholdWatchThresholdLevel.thresholdComparator',
          'thresholdWatchThresholdLevel.threshold'
        ], this.onChange);

        $scope.$watch('thresholdWatchThresholdLevel.form.$valid', this.checkValidity);
        $scope.$watch('thresholdWatchThresholdLevel.form.$dirty', this.checkDirty);
      }

      get itemDescription() {
        return this.thresholdComparator ? this.thresholdComparator.label : '';
      }

      get itemValue() {
        return this.threshold;
      }
    }
  };
});
