/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useMemo } from 'react';
import moment from 'moment';
import { first, last } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  EuiTableRow,
  EuiTableRowCell,
  EuiButtonEmpty,
  EuiCode,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiSpacer,
} from '@elastic/eui';
import { Axis, Chart, Settings, Position, TooltipValue, niceTimeFormatter } from '@elastic/charts';
import { AutoSizer } from '../../../../../../../components/auto_sizer';
import { createFormatter } from '../../../../../../../../common/formatters';
import { useUiSetting } from '../../../../../../../../../../../src/plugins/kibana_react/public';
import { getChartTheme } from '../../../../../metrics_explorer/components/helpers/get_chart_theme';
import { calculateDomain } from '../../../../../metrics_explorer/components/helpers/calculate_domain';
import { MetricsExplorerChartType } from '../../../../../metrics_explorer/hooks/use_metrics_explorer_options';
import { MetricExplorerSeriesChart } from '../../../../../metrics_explorer/components/series_chart';
import { MetricsExplorerAggregation } from '../../../../../../../../common/http_api';
import { Color } from '../../../../../../../../common/color_palette';
import { euiStyled } from '../../../../../../../../../observability/public';
import { Process } from './types';

interface Props {
  cells: React.ReactNode[];
  item: Process;
}

export const ProcessRow = ({ cells, item }: Props) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <EuiTableRow>
        <EuiTableRowCell isExpander textOnly={false}>
          <EuiButtonEmpty
            iconType={isExpanded ? 'arrowDown' : 'arrowRight'}
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded(!isExpanded)}
          />
        </EuiTableRowCell>
        {cells}
      </EuiTableRow>
      <EuiTableRow isExpandable isExpandedRow={isExpanded}>
        {isExpanded && (
          <AutoSizer bounds>
            {({ measureRef, bounds: { height = 0 } }) => (
              <ExpandedRowCell commandHeight={height}>
                <EuiSpacer size="s" />
                <EuiDescriptionList compressed>
                  <EuiFlexGroup gutterSize="s">
                    <EuiFlexItem>
                      <div ref={measureRef}>
                        <EuiDescriptionListTitle>
                          {i18n.translate(
                            'xpack.infra.metrics.nodeDetails.processes.expandedRowLabelCommand',
                            {
                              defaultMessage: 'Command',
                            }
                          )}
                        </EuiDescriptionListTitle>
                        <EuiDescriptionListDescription>
                          <ExpandedCommandLine>{item.command}</ExpandedCommandLine>
                        </EuiDescriptionListDescription>
                      </div>
                    </EuiFlexItem>
                    {item.apmTrace && (
                      <EuiFlexItem grow={false}>
                        <EuiButton>
                          {i18n.translate(
                            'xpack.infra.metrics.nodeDetails.processes.viewTraceInAPM',
                            {
                              defaultMessage: 'View trace in APM',
                            }
                          )}
                        </EuiButton>
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                  <EuiFlexGrid columns={2} gutterSize="s">
                    <EuiFlexItem>
                      <EuiDescriptionListTitle>
                        {i18n.translate(
                          'xpack.infra.metrics.nodeDetails.processes.expandedRowLabelPID',
                          {
                            defaultMessage: 'PID',
                          }
                        )}
                      </EuiDescriptionListTitle>
                      <EuiDescriptionListDescription>
                        <CodeLine>{item.pid}</CodeLine>
                      </EuiDescriptionListDescription>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiDescriptionListTitle>
                        {i18n.translate(
                          'xpack.infra.metrics.nodeDetails.processes.expandedRowLabelUser',
                          {
                            defaultMessage: 'User',
                          }
                        )}
                      </EuiDescriptionListTitle>
                      <EuiDescriptionListDescription>
                        <CodeLine>{item.user}</CodeLine>
                      </EuiDescriptionListDescription>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiDescriptionListTitle>{cpuMetricLabel}</EuiDescriptionListTitle>
                      <EuiDescriptionListDescription>
                        <ProcessChart
                          timeseries={item.timeseries.cpu}
                          color={Color.color2}
                          label={cpuMetricLabel}
                        />
                      </EuiDescriptionListDescription>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiDescriptionListTitle>{memoryMetricLabel}</EuiDescriptionListTitle>
                      <EuiDescriptionListDescription>
                        <ProcessChart
                          timeseries={item.timeseries.memory}
                          color={Color.color0}
                          label={memoryMetricLabel}
                        />
                      </EuiDescriptionListDescription>
                    </EuiFlexItem>
                  </EuiFlexGrid>
                </EuiDescriptionList>
              </ExpandedRowCell>
            )}
          </AutoSizer>
        )}
      </EuiTableRow>
    </>
  );
};

interface ProcessChartProps {
  timeseries: Process['timeseries']['x'];
  color: Color;
  label: string;
}
const ProcessChart = ({ timeseries, color, label }: ProcessChartProps) => {
  const chartMetric = {
    color,
    aggregation: 'avg' as MetricsExplorerAggregation,
    label,
  };
  const isDarkMode = useUiSetting<boolean>('theme:darkMode');

  const dateFormatter = useMemo(() => {
    if (!timeseries) return () => '';
    const firstTimestamp = first(timeseries.rows)?.timestamp;
    const lastTimestamp = last(timeseries.rows)?.timestamp;

    if (firstTimestamp == null || lastTimestamp == null) {
      return (value: number) => `${value}`;
    }

    return niceTimeFormatter([firstTimestamp, lastTimestamp]);
  }, [timeseries]);

  const yAxisFormatter = createFormatter('percent');

  const tooltipProps = {
    headerFormatter: (tooltipValue: TooltipValue) =>
      moment(tooltipValue.value).format('Y-MM-DD HH:mm:ss.SSS'),
  };

  const dataDomain = calculateDomain(timeseries, [chartMetric], false);
  const domain = dataDomain
    ? {
        max: dataDomain.max * 1.1, // add 10% headroom.
        min: dataDomain.min,
      }
    : { max: 0, min: 0 };

  return (
    <ChartContainer>
      <Chart>
        <MetricExplorerSeriesChart
          type={MetricsExplorerChartType.area}
          metric={chartMetric}
          id="0"
          series={timeseries}
          stack={false}
        />
        <Axis
          id={'timestamp'}
          position={Position.Bottom}
          showOverlappingTicks={true}
          tickFormat={dateFormatter}
        />
        <Axis
          id={'values'}
          position={Position.Left}
          tickFormat={yAxisFormatter}
          domain={domain}
          ticks={6}
          showGridLines
        />
        <Settings tooltip={tooltipProps} theme={getChartTheme(isDarkMode)} />
      </Chart>
    </ChartContainer>
  );
};

export const CodeLine = euiStyled(EuiCode).attrs({
  transparentBackground: true,
})`
  text-overflow: ellipsis;
  overflow: hidden;
  padding: 0 !important;
  & code.euiCodeBlock__code {
    white-space: nowrap !important;
    vertical-align: middle;
  }
`;

const ExpandedCommandLine = euiStyled(EuiCode).attrs({
  transparentBackground: true,
})`
  padding: 0 !important;
  margin-bottom: ${(props) => props.theme.eui.euiSizeS};
`;

const ExpandedRowCell = euiStyled(EuiTableRowCell).attrs({
  textOnly: false,
  colSpan: 6,
})<{ commandHeight: number }>`
  height: ${(props) => props.commandHeight + 240}px;
  padding: 0 ${(props) => props.theme.eui.paddingSizes.m};
  background-color: ${(props) => props.theme.eui.euiColorLightestShade};
`;

const ChartContainer = euiStyled.div`
  width: 300px;
  height: 140px;
`;

const cpuMetricLabel = i18n.translate(
  'xpack.infra.metrics.nodeDetails.processes.expandedRowLabelCPU',
  {
    defaultMessage: 'CPU',
  }
);

const memoryMetricLabel = i18n.translate(
  'xpack.infra.metrics.nodeDetails.processes.expandedRowLabelMemory',
  {
    defaultMessage: 'Memory',
  }
);
