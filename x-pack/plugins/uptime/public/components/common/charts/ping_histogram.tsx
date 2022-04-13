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
  Settings,
  timeFormatter,
  BrushEndListener,
  XYChartElementEvent,
  ElementClickListener,
  ScaleType,
} from '@elastic/charts';
import { EuiTitle, EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useContext } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import numeral from '@elastic/numeral';
import moment from 'moment';
import { useSelector } from 'react-redux';
import { getChartDateLabel } from '../../../lib/helper';
import { ChartWrapper } from './chart_wrapper';
import { UptimeThemeContext } from '../../../contexts';
import { HistogramResult } from '../../../../common/runtime_types';
import { useMonitorId, useUrlParams } from '../../../hooks';
import { ChartEmptyState } from './chart_empty_state';
import { getDateRangeFromChartElement } from './utils';
import { STATUS_DOWN_LABEL, STATUS_UP_LABEL } from '../translations';
import { createExploratoryViewUrl } from '../../../../../observability/public';
import { useUptimeSettingsContext } from '../../../contexts/uptime_settings_context';
import { monitorStatusSelector } from '../../../state/selectors';

export interface PingHistogramComponentProps {
  /**
   * The date/time for the start of the timespan.
   */
  absoluteStartDate: number;
  /**
   * The date/time for the end of the timespan.
   */
  absoluteEndDate: number;

  /**
   * Height is needed, since by default charts takes height of 100%
   */
  height?: string;

  data: HistogramResult | null;

  loading?: boolean;
}

interface BarPoint {
  x?: number;
  y?: number;
  type: string;
}

export const PingHistogramComponent: React.FC<PingHistogramComponentProps> = ({
  absoluteStartDate,
  absoluteEndDate,
  data,
  loading = false,
  height,
}) => {
  const {
    colors: { danger, gray },
    chartTheme,
  } = useContext(UptimeThemeContext);

  const monitorId = useMonitorId();

  const selectedMonitor = useSelector(monitorStatusSelector);

  const { basePath } = useUptimeSettingsContext();

  const [getUrlParams, updateUrlParams] = useUrlParams();

  const { dateRangeStart, dateRangeEnd } = getUrlParams();

  let content: JSX.Element | undefined;
  if (!data?.histogram?.length) {
    content = (
      <ChartEmptyState
        title={i18n.translate('xpack.uptime.snapshot.noDataTitle', {
          defaultMessage: 'No ping data available',
        })}
        body={i18n.translate('xpack.uptime.snapshot.noDataDescription', {
          defaultMessage: 'There are no pings in the selected time range.',
        })}
      />
    );
  } else {
    const { histogram, minInterval } = data;

    const onBrushEnd: BrushEndListener = ({ x }) => {
      if (!x) {
        return;
      }
      const [min, max] = x;
      updateUrlParams({
        dateRangeStart: moment(min).toISOString(),
        dateRangeEnd: moment(max).toISOString(),
      });
    };

    const onBarClicked: ElementClickListener = ([elementData]) => {
      updateUrlParams(
        getDateRangeFromChartElement(elementData as XYChartElementEvent, minInterval)
      );
    };

    const barData: BarPoint[] = [];

    histogram.forEach(({ x, upCount, downCount }) => {
      barData.push(
        { x, y: downCount ?? 0, type: STATUS_DOWN_LABEL },
        { x, y: upCount ?? 0, type: STATUS_UP_LABEL }
      );
    });

    content = (
      <ChartWrapper
        height={height}
        loading={loading}
        aria-label={i18n.translate('xpack.uptime.snapshotHistogram.description', {
          defaultMessage:
            'Bar Chart showing uptime status over time from {startTime} to {endTime}.',
          values: {
            startTime: moment(new Date(absoluteStartDate).valueOf()).fromNow(),
            endTime: moment(new Date(absoluteEndDate).valueOf()).fromNow(),
          },
        })}
      >
        <Chart>
          <Settings
            xDomain={{
              minInterval,
              min: absoluteStartDate,
              max: absoluteEndDate,
            }}
            showLegend={false}
            onBrushEnd={onBrushEnd}
            onElementClick={onBarClicked}
            {...chartTheme}
          />
          <Axis
            id={i18n.translate('xpack.uptime.snapshotHistogram.xAxisId', {
              defaultMessage: 'Ping X Axis',
            })}
            position={Position.Bottom}
            showOverlappingTicks={false}
            tickFormat={timeFormatter(getChartDateLabel(absoluteStartDate, absoluteEndDate))}
          />
          <Axis
            id={i18n.translate('xpack.uptime.snapshotHistogram.yAxisId', {
              defaultMessage: 'Ping Y Axis',
            })}
            position="left"
            tickFormat={(d) => numeral(d).format('0')}
            labelFormat={(d) => numeral(d).format('0a')}
            title={i18n.translate('xpack.uptime.snapshotHistogram.yAxis.title', {
              defaultMessage: 'Pings',
              description:
                'The label on the y-axis of a chart that displays the number of times Heartbeat has pinged a set of services/websites.',
            })}
          />

          <BarSeries
            color={[danger, gray]}
            data={barData}
            id={STATUS_DOWN_LABEL}
            name={i18n.translate('xpack.uptime.snapshotHistogram.series.pings', {
              defaultMessage: 'Monitor Pings',
            })}
            stackAccessors={['x']}
            splitSeriesAccessors={['type']}
            timeZone="local"
            xAccessor="x"
            xScaleType={ScaleType.Time}
            yAccessors={['y']}
            yScaleType={ScaleType.Linear}
          />
        </Chart>
      </ChartWrapper>
    );
  }

  const pingHistogramExploratoryViewLink = createExploratoryViewUrl(
    {
      reportType: 'kpi-over-time',
      allSeries: [
        {
          name: `${monitorId}-pings`,
          dataType: 'synthetics',
          selectedMetricField: 'summary.up',
          time: { from: dateRangeStart, to: dateRangeEnd },
          reportDefinitions: {
            'monitor.name':
              monitorId && selectedMonitor?.monitor?.name
                ? [selectedMonitor.monitor.name]
                : ['ALL_VALUES'],
          },
        },
      ],
    },
    basePath
  );

  const showAnalyzeButton = false;

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.uptime.snapshot.pingsOverTimeTitle"
                defaultMessage="Pings over time"
              />
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        {showAnalyzeButton && (
          <EuiFlexItem grow={false}>
            <EuiButton size="s" href={pingHistogramExploratoryViewLink}>
              <FormattedMessage id="xpack.uptime.pingHistogram.analyze" defaultMessage="Analyze" />
            </EuiButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {content}
    </>
  );
};
