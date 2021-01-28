/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiEmptyPrompt } from '@elastic/eui';
import { RectAnnotationDatum, AnnotationId } from '@elastic/charts';
import {
  Axis,
  BarSeries,
  Chart,
  niceTimeFormatter,
  Settings,
  TooltipValue,
  LIGHT_THEME,
  DARK_THEME,
  RectAnnotation,
  BrushEndListener,
} from '@elastic/charts';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import React, { useCallback, useMemo } from 'react';
import { LoadingOverlayWrapper } from '../../../../../components/loading_overlay_wrapper';

import { TimeRange } from '../../../../../../common/time/time_range';
import {
  MLSeverityScoreCategories,
  ML_SEVERITY_COLORS,
} from '../../../../../../common/log_analysis';
import { useKibanaUiSetting } from '../../../../../utils/use_kibana_ui_setting';

export const AnomaliesChart: React.FunctionComponent<{
  chartId: string;
  setTimeRange: (timeRange: TimeRange) => void;
  timeRange: TimeRange;
  series: Array<{ time: number; value: number }>;
  annotations: Record<MLSeverityScoreCategories, RectAnnotationDatum[]>;
  renderAnnotationTooltip?: (details?: string) => JSX.Element;
  isLoading: boolean;
}> = ({
  chartId,
  series,
  annotations,
  setTimeRange,
  timeRange,
  renderAnnotationTooltip,
  isLoading,
}) => {
  const [dateFormat] = useKibanaUiSetting('dateFormat', 'Y-MM-DD HH:mm:ss.SSS');
  const [isDarkMode] = useKibanaUiSetting('theme:darkMode');

  const chartDateFormatter = useMemo(
    () => niceTimeFormatter([timeRange.startTime, timeRange.endTime]),
    [timeRange]
  );

  const logEntryRateSpecId = 'averageValues';

  const tooltipProps = useMemo(
    () => ({
      headerFormatter: (tooltipData: TooltipValue) => moment(tooltipData.value).format(dateFormat),
    }),
    [dateFormat]
  );

  const handleBrushEnd = useCallback<BrushEndListener>(
    ({ x }) => {
      if (!x) {
        return;
      }
      const [startTime, endTime] = x;
      setTimeRange({
        endTime,
        startTime,
      });
    },
    [setTimeRange]
  );

  return !isLoading && !series.length ? (
    <EuiEmptyPrompt
      title={
        <h2>
          {i18n.translate('xpack.infra.logs.analysis.anomalySectionLogRateChartNoData', {
            defaultMessage: 'There is no log rate data to display.',
          })}
        </h2>
      }
      titleSize="m"
    />
  ) : (
    <LoadingOverlayWrapper isLoading={isLoading}>
      <div style={{ height: 160, width: '100%' }}>
        {series.length ? (
          <Chart className="log-entry-rate-chart">
            <Axis
              id="timestamp"
              position="bottom"
              showOverlappingTicks
              tickFormat={chartDateFormatter}
            />
            <Axis
              id="values"
              position="left"
              tickFormat={(value) => numeral(value.toPrecision(3)).format('0[.][00]a')} // https://github.com/adamwdraper/Numeral-js/issues/194
            />
            <BarSeries
              id={logEntryRateSpecId}
              name={i18n.translate('xpack.infra.logs.analysis.anomaliesSectionLineSeriesName', {
                defaultMessage: 'Log entries per 15 minutes (avg)',
              })}
              xScaleType="time"
              yScaleType="linear"
              xAccessor={'time'}
              yAccessors={['value']}
              data={series}
              barSeriesStyle={barSeriesStyle}
            />
            {renderAnnotations(annotations, chartId, renderAnnotationTooltip)}
            <Settings
              onBrushEnd={handleBrushEnd}
              tooltip={tooltipProps}
              baseTheme={isDarkMode ? DARK_THEME : LIGHT_THEME}
              xDomain={{ min: timeRange.startTime, max: timeRange.endTime }}
            />
          </Chart>
        ) : null}
      </div>
    </LoadingOverlayWrapper>
  );
};

interface SeverityConfig {
  id: AnnotationId;
  style: {
    fill: string;
    opacity: number;
  };
}

const severityConfigs: Record<string, SeverityConfig> = {
  warning: {
    id: `anomalies-warning`,
    style: { fill: ML_SEVERITY_COLORS.warning, opacity: 0.7 },
  },
  minor: {
    id: `anomalies-minor`,
    style: { fill: ML_SEVERITY_COLORS.minor, opacity: 0.7 },
  },
  major: {
    id: `anomalies-major`,
    style: { fill: ML_SEVERITY_COLORS.major, opacity: 0.7 },
  },
  critical: {
    id: `anomalies-critical`,
    style: { fill: ML_SEVERITY_COLORS.critical, opacity: 0.7 },
  },
};

const renderAnnotations = (
  annotations: Record<MLSeverityScoreCategories, RectAnnotationDatum[]>,
  chartId: string,
  renderAnnotationTooltip?: (details?: string) => JSX.Element
) => {
  return Object.entries(annotations).map((entry, index) => {
    return (
      <RectAnnotation
        key={`${chartId}:${entry[0]}`}
        dataValues={entry[1]}
        id={severityConfigs[entry[0]].id}
        style={severityConfigs[entry[0]].style}
        renderTooltip={renderAnnotationTooltip}
      />
    );
  });
};

const barSeriesStyle = { rect: { fill: '#D3DAE6', opacity: 0.6 } }; // TODO: Acquire this from "theme" as euiColorLightShade
