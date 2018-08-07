/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { render } from 'react-dom';
import moment from 'moment';
import { get, first } from 'lodash';
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
import { timefilter } from 'ui/timefilter';

import {
  EuiScreenReaderOnly
} from '@elastic/eui';

const uiModule = uiModules.get('plugins/monitoring/directives', []);
uiModule.directive('monitoringChart', () => {
  return {
    restrict: 'E',
    scope: {
      series: '='
    },
    link(scope, $elem) {

      const series = scope.series;
      const units = getUnits(series);


      function onBrush({ xaxis }) {
        timefilter.setTime({
          from: moment(xaxis.from),
          to: moment(xaxis.to),
          mode: 'absolute'
        });
      }

      scope.$watch('series', series => {
        const title = getTitle(series);
        const titleForAriaIds = title.replace(/\s+/, '--');
        const bucketSize = get(first(series), 'bucket_size'); // bucket size will be the same for all metrics in all series
        const seriesScreenReaderTextList = [`Interval: ${bucketSize}`]
          .concat(series.map(item => `${item.metric.label}: ${item.metric.description}`));

        render(
          <div className="monitoring-chart__container">
            <h2 className="euiTitle">
              <EuiScreenReaderOnly><span>This chart is not screen reader accessible</span></EuiScreenReaderOnly>
              { getTitle(series) }{ units ? ` (${units})` : '' }
              <OverlayTrigger
                placement="left"
                trigger="click"
                overlay={
                  <Tooltip>
                    <InfoTooltip series={series} bucketSize={bucketSize}/>
                  </Tooltip>
                }
              >
                <span className="monitoring-chart-tooltip__trigger overlay-trigger">
                  <Fragment>
                    <KuiInfoButton aria-labelledby={`monitoringChart${titleForAriaIds}`} />
                    <EuiScreenReaderOnly>
                      <span id={`monitoringChart${titleForAriaIds}`}>
                        {seriesScreenReaderTextList.join('. ')}
                      </span>
                    </EuiScreenReaderOnly>
                  </Fragment>
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
