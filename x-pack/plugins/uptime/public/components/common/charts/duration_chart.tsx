/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useState } from 'react';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  Axis,
  Chart,
  Position,
  timeFormatter,
  Settings,
  SeriesIdentifier,
  BrushEndListener,
} from '@elastic/charts';
import { getChartDateLabel } from '../../../lib/helper';
import { LocationDurationLine } from '../../../../common/types';
import { DurationLineSeriesList } from './duration_line_series_list';
import { ChartWrapper } from './chart_wrapper';
import { useUrlParams } from '../../../hooks';
import { getTickFormat } from './get_tick_format';
import { ChartEmptyState } from './chart_empty_state';
import { DurationAnomaliesBar } from './duration_line_bar_list';
import { AnomalyRecords } from '../../../state/actions';
import { UptimeThemeContext } from '../../../contexts';

interface DurationChartProps {
  /**
   * Timeseries data that is used to express an average line series
   * on the duration chart. One entry per location
   */
  locationDurationLines: LocationDurationLine[];

  /**
   * To represent the loading spinner on chart
   */
  loading: boolean;

  anomalies: AnomalyRecords | null;
}

/**
 * This chart is intended to visualize monitor duration performance over time to
 * the users in a helpful way. Its x-axis is based on a timeseries, the y-axis is in
 * milliseconds.
 * @param props The props required for this component to render properly
 */
export const DurationChartComponent = ({
  locationDurationLines,
  anomalies,
  loading,
}: DurationChartProps) => {
  const hasLines = locationDurationLines.length > 0;
  const [getUrlParams, updateUrlParams] = useUrlParams();
  const { absoluteDateRangeStart: min, absoluteDateRangeEnd: max } = getUrlParams();

  const [hiddenLegends, setHiddenLegends] = useState<string[]>([]);

  const { chartTheme } = useContext(UptimeThemeContext);

  const onBrushEnd: BrushEndListener = ({ x }) => {
    if (!x) {
      return;
    }
    const [minX, maxX] = x;
    updateUrlParams({
      dateRangeStart: moment(minX).toISOString(),
      dateRangeEnd: moment(maxX).toISOString(),
    });
  };

  const legendToggleVisibility = (legendItem: SeriesIdentifier | null) => {
    if (legendItem) {
      setHiddenLegends((prevState) => {
        if (prevState.includes(legendItem.specId)) {
          return [...prevState.filter((item) => item !== legendItem.specId)];
        } else {
          return [...prevState, legendItem.specId];
        }
      });
    }
  };

  return (
    <ChartWrapper height="400px" loading={loading}>
      {hasLines ? (
        <Chart>
          <Settings
            xDomain={{ min, max }}
            showLegend
            showLegendExtra
            legendPosition={Position.Bottom}
            onBrushEnd={onBrushEnd}
            onLegendItemClick={legendToggleVisibility}
            {...chartTheme}
          />
          <Axis
            id="bottom"
            position={Position.Bottom}
            showOverlappingTicks={true}
            tickFormat={timeFormatter(getChartDateLabel(min, max))}
            title={i18n.translate('xpack.uptime.monitorCharts.durationChart.bottomAxis.title', {
              defaultMessage: 'Timestamp',
            })}
          />
          <Axis
            domain={{ min: 0 }}
            id="left"
            position={Position.Left}
            tickFormat={(d) => getTickFormat(d)}
            title={i18n.translate('xpack.uptime.monitorCharts.durationChart.leftAxis.title', {
              defaultMessage: 'Duration ms',
            })}
          />
          <DurationLineSeriesList lines={locationDurationLines} />
          <DurationAnomaliesBar anomalies={anomalies} hiddenLegends={hiddenLegends} />
        </Chart>
      ) : (
        <ChartEmptyState
          body={
            <FormattedMessage
              id="xpack.uptime.durationChart.emptyPrompt.description"
              defaultMessage="This monitor has never been {emphasizedText} during the selected time range."
              values={{ emphasizedText: <strong>up</strong> }}
            />
          }
          title={i18n.translate('xpack.uptime.durationChart.emptyPrompt.title', {
            defaultMessage: 'No duration data available',
          })}
        />
      )}
    </ChartWrapper>
  );
};
