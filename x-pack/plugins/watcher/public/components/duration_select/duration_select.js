/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'ui/fancy_forms';
import { uiModules } from 'ui/modules';
import { InitAfterBindingsWorkaround } from 'ui/compat';
import { TIME_UNITS } from 'plugins/watcher/constants';
import template from './duration_select.html';
import moment from 'moment';
import 'plugins/watcher/services/html_id_generator';

const app = uiModules.get('xpack/watcher');

app.directive('durationSelect', function ($injector) {
  const htmlIdGeneratorFactory = $injector.get('xpackWatcherHtmlIdGeneratorFactory');

  return {
    require: '^form',
    scope: {
      durationId: '@',
      minimumUnit: '=',
      minimumSize: '=',
      unit: '=',
      size: '=',
      describedBy: '@',
    },
    template,
    replace: true,
    controllerAs: 'durationSelect',
    bindToController: true,
    link: function ($scope, $element, $attrs, $ctrl) {
      $scope.durationSelect.form = $ctrl;
    },
    controller: class DurationSelectController extends InitAfterBindingsWorkaround {
      initAfterBindings($scope) {
        this.timeUnits = TIME_UNITS;
        this.makeId = htmlIdGeneratorFactory.create(['durationSelect', this.durationId]);

        $scope.$watchMulti([
          'durationSelect.minimumSize',
          'durationSelect.minimumUnit'
        ], ([minimumSize, minimumUnit]) => {
          this.minimumDuration = moment.duration(Number(minimumSize), minimumUnit).asMilliseconds();
          this.checkValidity();
        });

        $scope.$watchMulti([
          `durationSelect.size`,
          `durationSelect.unit`
        ], ([size, unit]) => {
          this.duration = moment.duration(Number(size), unit).asMilliseconds();
          this.checkValidity();
        });
      }

      checkValidity = () => {
        const isValid = this.duration >= this.minimumDuration;
        const sizeName = this.makeId('size');
        const unitName = this.makeId('unit');

        if (this.form[sizeName]) {
          this.form[sizeName].$setTouched(true);
          this.form[sizeName].$setValidity('minimumDuration', isValid);
        }

        if (this.form[unitName]) {
          this.form[unitName].$setTouched(true);
          this.form[unitName].$setValidity('minimumDuration', isValid);
        }
      }
    }
  };
});
