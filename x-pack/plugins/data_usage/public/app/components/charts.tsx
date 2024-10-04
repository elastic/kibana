/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle, useEuiTheme } from '@elastic/eui';
import {
  Chart,
  Axis,
  BarSeries,
  Settings,
  ScaleType,
  niceTimeFormatter,
  DARK_THEME,
  LIGHT_THEME,
} from '@elastic/charts';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import { MetricsResponse } from '../types';
import { useKibanaContextForPlugin } from '../../utils/use_kibana';
import { MetricTypes } from '../../../common/rest_types';
import { LegendAction } from './legend_action';
interface ChartsProps {
  data: MetricsResponse;
}
const formatBytes = (bytes: number) => {
  return numeral(bytes).format('0.0 b');
};

// TODO: Remove this when we have a title for each metric type
type ChartKey = Extract<MetricTypes, 'ingest_rate' | 'storage_retained'>;
export const chartKeyToTitleMap: Record<ChartKey, string> = {
  ingest_rate: i18n.translate('xpack.dataUsage.charts.ingestedMax', {
    defaultMessage: 'Data Ingested',
  }),
  storage_retained: i18n.translate('xpack.dataUsage.charts.retainedMax', {
    defaultMessage: 'Data Retained in Storage',
  }),
};

export const Charts: React.FC<ChartsProps> = ({ data }) => {
  const [popoverOpen, setPopoverOpen] = useState<string | null>(null);
  const theme = useEuiTheme();
  const {
    services: {
      application: { capabilities },
    },
  } = useKibanaContextForPlugin();
  const hasDataSetQualityFeature = !!capabilities?.data_quality;
  const hasIndexManagementFeature = !!capabilities?.index_management;

  const togglePopover = useCallback((streamName: string | null) => {
    setPopoverOpen((prev) => (prev === streamName ? null : streamName));
  }, []);
  return (
    <EuiFlexGroup direction="column">
      {data.charts.map((chart, idx) => {
        const chartTimestamps = chart.series.flatMap((series) => series.data.map((d) => d.x));
        const minTimestamp = Math.min(...chartTimestamps);
        const maxTimestamp = Math.max(...chartTimestamps);
        const tickFormat = niceTimeFormatter([minTimestamp, maxTimestamp]);

        return (
          <EuiFlexItem grow={false} key={chart.key}>
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
                    legendAction={({ label }) => (
                      <LegendAction
                        idx={idx}
                        popoverOpen={popoverOpen}
                        togglePopover={togglePopover}
                        hasIndexManagementFeature={hasIndexManagementFeature}
                        hasDataSetQualityFeature={hasDataSetQualityFeature}
                        label={label}
                      />
                    )}
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
