/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { first, get } from 'lodash';
import { Tooltip } from 'pivotal-ui/react/tooltip';
import { OverlayTrigger } from 'pivotal-ui/react/overlay-trigger';
import { KuiInfoButton } from '@kbn/ui-framework/components';
import { getTitle } from './get_title';
import { getUnits } from './get_units';
import { MonitoringTimeseries } from './monitoring_timeseries';
import { InfoTooltip } from './info_tooltip';

import {
  EuiScreenReaderOnly
} from '@elastic/eui';

export function MonitoringTimeseriesContainer({ series, onBrush }) {
  if (series === undefined) {
    return null; // still loading
  }

  const title = getTitle(series);
  const titleForAriaIds = title.replace(/\s+/, '--');
  const units = getUnits(series);
  const bucketSize = get(first(series), 'bucket_size'); // bucket size will be the same for all metrics in all series

  const seriesScreenReaderTextList = [`Interval: ${bucketSize}`];
  seriesScreenReaderTextList.push(...series.map(item => `${item.metric.label}: ${item.metric.description}`));

  return (
    <div className="monitoring-chart__container">
      <h2 className="euiTitle" tabIndex="0">
        <EuiScreenReaderOnly><span>This chart is not accessible yet</span></EuiScreenReaderOnly>
        { title }{ units ? ` (${units})` : '' }
        <OverlayTrigger
          placement="left"
          trigger="click"
          overlay={<Tooltip><InfoTooltip series={series} bucketSize={bucketSize}/></Tooltip>}
        >
          <span className="monitoring-chart-tooltip__trigger overlay-trigger">
            <Fragment>
              <KuiInfoButton aria-labelledby={`monitoringChart${titleForAriaIds}`} />
              <span id={`monitoringChart${titleForAriaIds}`} className="kuiScreenReaderOnly">
                {seriesScreenReaderTextList.join('.')}
              </span>
            </Fragment>
          </span>
        </OverlayTrigger>
      </h2>
      <MonitoringTimeseries
        series={series}
        onBrush={onBrush}
      />
    </div>
  );
}

