/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Chart, Settings, Metric, MetricTrendShape } from '@elastic/charts';
import { EuiPanel, EuiLoadingChart } from '@elastic/eui';
import { DARK_THEME } from '@elastic/charts';
import { useTheme } from '@kbn/observability-plugin/public';
import { useLocationName, useStatusByLocation } from '../../../../hooks';
import { formatDuration } from '../../../../utils/formatting';
import { Ping } from '../../../../../../../common/runtime_types';

export const getColor = (theme: ReturnType<typeof useTheme>, isEnabled: boolean, ping?: Ping) => {
  if (!isEnabled) {
    return theme.eui.euiColorLightestShade;
  }
  return (ping?.summary?.down || 0) > 0
    ? theme.eui.euiColorVis9_behindText
    : theme.eui.euiColorVis0_behindText;
};

export const MetricItem = ({
  monitorId,
  locationId,
  monitorName,
  isMonitorEnabled,
  averageDuration,
  data,
  loaded,
}: {
  monitorId: string;
  locationId: string;
  monitorName: string;
  isMonitorEnabled: boolean;
  data: Array<{ x: number; y: number }>;
  averageDuration: number;
  loaded: boolean;
}) => {
  const locationName = useLocationName({ locationId });
  const { locations } = useStatusByLocation(monitorId);
  const ping = locations.find((loc) => loc.observer?.geo?.name === locationName);
  const theme = useTheme();

  return (
    <div
      style={{
        height: '160px',
      }}
    >
      {loaded ? (
        <EuiPanel
          style={{
            padding: '0px',
            height: '100%',
            overflow: 'hidden',
          }}
        >
          <Chart>
            <Settings baseTheme={DARK_THEME} />
            <Metric
              id={`${monitorId}-${locationId}`}
              data={[
                [
                  {
                    title: monitorName,
                    subtitle: locationName,
                    value: averageDuration,
                    trendShape: MetricTrendShape.Area,
                    trend: data,
                    valueFormatter: (d: number) => formatDuration(d),
                    color: getColor(theme, isMonitorEnabled, ping),
                  },
                ],
              ]}
            />
          </Chart>
        </EuiPanel>
      ) : (
        <EuiLoadingChart mono />
      )}
    </div>
  );
};
