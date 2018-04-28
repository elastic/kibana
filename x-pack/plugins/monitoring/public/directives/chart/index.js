/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import moment from 'moment';
import { uiModules } from 'ui/modules';
import {
  getTitle,
  getUnits,
  MonitoringTimeseries,
  InfoTooltip,
} from 'plugins/monitoring/components/chart';
import { Tooltip } from 'pivotal-ui/react/tooltip';
import { OverlayTrigger } from 'pivotal-ui/react/overlay-trigger';
import { KuiInfoButton } from '@kbn/ui-framework/components';

const uiModule = uiModules.get('plugins/monitoring/directives', []);
uiModule.directive('monitoringChart', (timefilter) => {
  return {
    restrict: 'E',
    scope: {
      series: '='
    },
    link(scope, $elem) {

      const series = scope.series;
      const units = getUnits(series);

      function onBrush({ xaxis }) {
        scope.$evalAsync(() => {
          timefilter.time.from = moment(xaxis.from);
          timefilter.time.to = moment(xaxis.to);
          timefilter.time.mode = 'absolute';
        });
      }

      scope.$watch('series', series => {
        render(
          <div className="monitoring-chart__container">
            <h2 className="euiTitle">
              { getTitle(series) }{ units ? ` (${units})` : '' }
              <OverlayTrigger
                placement="left"
                trigger="click"
                overlay={
                  <Tooltip>
                    <InfoTooltip series={series}/>
                  </Tooltip>
                }
              >
                <span className="monitoring-chart-tooltip__trigger overlay-trigger">
                  <KuiInfoButton />
                </span>
              </OverlayTrigger>
            </h2>
            <MonitoringTimeseries
              series={series}
              onBrush={onBrush}
            />
          </div>,
          $elem[0]
        );
      });
    }
  };
});
