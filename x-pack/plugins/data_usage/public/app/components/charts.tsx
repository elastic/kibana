/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroup,
  EuiListGroupItem,
  EuiPanel,
  EuiPopover,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import {
  Chart,
  Axis,
  BarSeries,
  Settings,
  ScaleType,
  niceTimeFormatter,
  LegendActionProps,
  DARK_THEME,
  LIGHT_THEME,
} from '@elastic/charts';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';

import { MetricsResponse } from '../types';
import { MetricKey } from '../../../common/types';
interface ChartsProps {
  data: MetricsResponse;
}
const formatBytes = (bytes: number) => {
  return numeral(bytes).format('0.0 b');
};

export const chartKeyToTitleMap: Record<MetricKey, string> = {
  ingestedMax: i18n.translate('xpack.dataUsage.charts.ingestedMax', {
    defaultMessage: 'Data Ingested',
  }),
  retainedMax: i18n.translate('xpack.dataUsage.charts.retainedMax', {
    defaultMessage: 'Data Retained in Storage',
  }),
};

export const Charts: React.FC<ChartsProps> = ({ data }) => {
  const [popoverOpen, setPopoverOpen] = useState<string | null>(null);
  const theme = useEuiTheme();

  const togglePopover = (streamName: string) => {
    setPopoverOpen(popoverOpen === streamName ? null : streamName);
  };
  return (
    <EuiFlexGroup direction="column">
      {data.charts.map((chart, idx) => {
        const chartTimestamps = chart.series.flatMap((series) => series.data.map((d) => d.x));
        const minTimestamp = Math.min(...chartTimestamps);
        const maxTimestamp = Math.max(...chartTimestamps);
        const tickFormat = niceTimeFormatter([minTimestamp, maxTimestamp]);

        return (
          <EuiFlexItem grow={false}>
            <EuiPanel key={idx} hasShadow={false} hasBorder={true}>
              <div key={idx}>
                <EuiTitle size="xs">
                  <h5>{chartKeyToTitleMap[chart.key] || chart.key}</h5>
                </EuiTitle>
                <Chart size={{ height: 200 }}>
                  <Settings
                    theme={theme.colorMode === 'DARK' ? DARK_THEME : LIGHT_THEME}
                    showLegend={true}
                    legendPosition="right"
                    xDomain={{ min: minTimestamp, max: maxTimestamp }}
                    legendAction={({ label }: LegendActionProps) => {
                      const streamName = `${idx}-${label}`;
                      return (
                        <EuiFlexGroup gutterSize="s" alignItems="center">
                          <EuiPopover
                            button={
                              <EuiFlexGroup gutterSize="s" alignItems="center">
                                <EuiFlexItem grow={false}>
                                  <EuiButtonIcon
                                    iconType="boxesHorizontal"
                                    aria-label="Open data stream actions"
                                    onClick={() => togglePopover(streamName)}
                                  />
                                </EuiFlexItem>
                              </EuiFlexGroup>
                            }
                            isOpen={popoverOpen === streamName}
                            closePopover={() => setPopoverOpen(null)}
                            anchorPosition="downRight"
                          >
                            <EuiListGroup gutterSize="none">
                              <EuiListGroupItem
                                href="#"
                                label="Copy data stream name"
                                onClick={() => undefined}
                              />
                              <EuiListGroupItem
                                href="#"
                                label="Manage data stream"
                                onClick={() => undefined}
                              />
                              <EuiListGroupItem
                                href="#"
                                label="View data quality"
                                onClick={() => undefined}
                              />
                            </EuiListGroup>
                          </EuiPopover>
                        </EuiFlexGroup>
                      );
                    }}
                  />
                  {chart.series.map((stream, streamIdx) => (
                    <BarSeries
                      key={streamIdx}
                      id={`${chart.key}-${stream.streamName}`}
                      name={`${stream.streamName}`}
                      data={stream.data.map((point) => [point.x, point.y])}
                      xScaleType={ScaleType.Time}
                      yScaleType={ScaleType.Linear}
                      xAccessor={0}
                      yAccessors={[1]}
                      stackAccessors={[0]}
                    />
                  ))}

                  <Axis
                    id="bottom-axis"
                    position="bottom"
                    tickFormat={tickFormat}
                    gridLine={{ visible: false }}
                  />

                  <Axis
                    id="left-axis"
                    position="left"
                    gridLine={{ visible: true }}
                    tickFormat={(d) => formatBytes(d)}
                  />
                </Chart>
              </div>
            </EuiPanel>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
