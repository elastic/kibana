/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import moment from 'moment';
import { render } from 'react-dom';
import { uiModules } from 'ui/modules';
import { BeatsOverview } from 'plugins/monitoring/components/beats/overview';
import { timefilter } from 'ui/timefilter';

const uiModule = uiModules.get('monitoring/directives', []);
uiModule.directive('monitoringBeatsOverview', () => {
  return {
    restrict: 'E',
    scope: {
      data: '=',
    },
    link(scope, $el) {

      function onBrush({ xaxis }) {
        timefilter.setTime({
          from: moment(xaxis.from),
          to: moment(xaxis.to),
          mode: 'absolute'
        });
      }

      scope.$watch('data', (data = {}) => {
        render((
          <BeatsOverview
            {...data}
            onBrush={onBrush}
          />
        ), $el[0]);
      });

    }
  };
});
