/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Tooltip } from 'pivotal-ui/react/tooltip';
import { OverlayTrigger } from 'pivotal-ui/react/overlay-trigger';
import { KuiInfoButton } from '@kbn/ui-framework/components';
import { getTitle } from './get_title';
import { getUnits } from './get_units';
import { MonitoringTimeseries } from './monitoring_timeseries';
import { InfoTooltip } from './info_tooltip';

export function MonitoringTimeseriesContainer({ series, onBrush }) {
  if (series === undefined) {
    return null; // still loading
  }

  const units = getUnits(series);

  return (
    <div className="monitoring-chart__container">
      <h2 className="euiTitle">
        { getTitle(series) }{ units ? ` (${units})` : '' }
        <OverlayTrigger
          placement="left"
          trigger="click"
          overlay={<Tooltip><InfoTooltip series={series}/></Tooltip>}
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
    </div>
  );
}

