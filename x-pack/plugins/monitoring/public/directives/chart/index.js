/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import moment from 'moment';
import { uiModules } from 'ui/modules';
import { timefilter } from 'ui/timefilter';
import { MonitoringTimeseriesContainer } from '../../components/chart/monitoring_timeseries_container';
import { EuiSpacer } from '@elastic/eui';
import { I18nContext } from 'ui/i18n';

const uiModule = uiModules.get('plugins/monitoring/directives', []);
uiModule.directive('monitoringChart', () => {
  return {
    restrict: 'E',
    scope: {
      series: '='
    },
    link(scope, $elem) {
      scope.$on('$destroy', () => $elem && $elem[0] && unmountComponentAtNode($elem[0]));

      function onBrush({ xaxis }) {
        timefilter.setTime({
          from: moment(xaxis.from),
          to: moment(xaxis.to),
          mode: 'absolute'
        });
      }

      scope.$watch('series', series => {
        render(
          <I18nContext>
            <Fragment>
              <MonitoringTimeseriesContainer
                series={series}
                onBrush={onBrush}
              />
              <EuiSpacer size="m"/>
            </Fragment>
          </I18nContext>,
          $elem[0]
        );
      });
    }
  };
});
