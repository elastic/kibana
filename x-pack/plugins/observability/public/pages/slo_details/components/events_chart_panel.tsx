/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Axis,
  BarSeries,
  Chart,
  Position,
  ScaleType,
  Settings,
  Tooltip,
  TooltipType,
} from '@elastic/charts';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingChart,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import { useActiveCursor } from '@kbn/charts-plugin/public';
import { i18n } from '@kbn/i18n';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import moment from 'moment';
import React, { useRef } from 'react';
import { useGetPreviewData } from '../../../hooks/slo/use_get_preview_data';
import { useKibana } from '../../../utils/kibana_react';

export interface Props {
  slo: SLOWithSummaryResponse;
  range: {
    start: number;
    end: number;
  };
}

export function EventsChartPanel({ slo, range }: Props) {
  const { charts, uiSettings } = useKibana().services;
  const { euiTheme } = useEuiTheme();
  const { isLoading, data } = useGetPreviewData(true, slo.indicator, range);
  const baseTheme = charts.theme.useChartsBaseTheme();
  const chartRef = useRef(null);
  const handleCursorUpdate = useActiveCursor(charts.activeCursor, chartRef, {
    isDateHistogram: true,
  });

  const dateFormat = uiSettings.get('dateFormat');

  return (
    <EuiPanel paddingSize="m" color="transparent" hasBorder data-test-subj="eventsChartPanel">
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h2>
                {i18n.translate('xpack.observability.slo.sloDetails.eventsChartPanel.title', {
                  defaultMessage: 'Good vs bad events',
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText color="subdued" size="s">
              {i18n.translate('xpack.observability.slo.sloDetails.eventsChartPanel.duration', {
                defaultMessage: 'Last 24h',
              })}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiFlexItem>
          {isLoading && <EuiLoadingChart size="m" mono data-test-subj="sliEventsChartLoading" />}

          {!isLoading && (
            <Chart size={{ height: 150, width: '100%' }} ref={chartRef}>
              <Tooltip type={TooltipType.VerticalCursor} />
              <Settings
                baseTheme={baseTheme}
                showLegend
                showLegendExtra={false}
                legendPosition={Position.Left}
                noResults={
                  <EuiIcon type="visualizeApp" size="l" color="subdued" title="no results" />
                }
                onPointerUpdate={handleCursorUpdate}
                externalPointerEvents={{
                  tooltip: { visible: true },
                }}
                pointerUpdateDebounce={0}
                pointerUpdateTrigger={'x'}
                locale={i18n.getLocale()}
              />

              <Axis
                id="bottom"
                position={Position.Bottom}
                showOverlappingTicks
                tickFormat={(d) => moment(d).format(dateFormat)}
              />
              <Axis
                id="left"
                position={Position.Left}
                tickFormat={(d) => numeral(d).format('0,0')}
              />

              <BarSeries
                id={i18n.translate(
                  'xpack.observability.slo.sloDetails.eventsChartPanel.goodEventsLabel',
                  { defaultMessage: 'Good events' }
                )}
                color={euiTheme.colors.success}
                barSeriesStyle={{
                  rect: { fill: euiTheme.colors.success },
                  displayValue: { fill: euiTheme.colors.success },
                }}
                xScaleType={ScaleType.Time}
                yScaleType={ScaleType.Linear}
                xAccessor="key"
                yAccessors={['value']}
                stackAccessors={[0]}
                data={
                  data?.map((datum) => ({
                    key: new Date(datum.date).getTime(),
                    value: datum.events?.good,
                  })) ?? []
                }
              />

              <BarSeries
                id={i18n.translate(
                  'xpack.observability.slo.sloDetails.eventsChartPanel.badEventsLabel',
                  { defaultMessage: 'Bad events' }
                )}
                color={euiTheme.colors.danger}
                barSeriesStyle={{
                  rect: { fill: euiTheme.colors.danger },
                  displayValue: { fill: euiTheme.colors.danger },
                }}
                xScaleType={ScaleType.Time}
                yScaleType={ScaleType.Linear}
                xAccessor="key"
                yAccessors={['value']}
                stackAccessors={[0]}
                data={
                  data?.map((datum) => ({
                    key: new Date(datum.date).getTime(),
                    value: datum.events?.bad,
                  })) ?? []
                }
              />
            </Chart>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
