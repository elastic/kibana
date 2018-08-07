/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { getTitle } from './get_title';
import { getUnits } from './get_units';
import { MonitoringTimeseries } from './monitoring_timeseries';
import { InfoTooltip } from './info_tooltip';

import {
  EuiIconTip, EuiFlexGroup, EuiFlexItem, EuiTitle
} from '@elastic/eui';

export function MonitoringTimeseriesContainer({ series, onBrush }) {
  if (series === undefined) {
    return null; // still loading
  }

  const units = getUnits(series);

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" style={{ flexGrow: 0 }}>
          <EuiFlexItem>
            <EuiTitle>
              <h2>
                { getTitle(series) }{ units ? ` (${units})` : '' }
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIconTip
              anchorClassName="eui-textRight eui-alignMiddle monitoring-chart-tooltip__trigger"
              className="monitoring-chart-tooltip__wrapper"
              type="iInCircle"
              position="right"
              content={<InfoTooltip series={series}/>}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem style={{ minHeight: '200px' }}>
        <MonitoringTimeseries
          series={series}
          onBrush={onBrush}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

