/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useCallback, useEffect, useMemo, useState } from 'react';
import moment from 'moment';

import type {
  BrushEndListener,
  ElementClickListener,
  XYChartElementEvent,
  XYBrushEvent,
} from '@elastic/charts';
import { Axis, Chart, HistogramBarSeries, Position, ScaleType, Settings } from '@elastic/charts';
import type {
  BarStyleAccessor,
  RectAnnotationSpec,
} from '@elastic/charts/dist/chart_types/xy_chart/utils/specs';
import { getTimeZone } from '@kbn/visualization-utils';
import { i18n } from '@kbn/i18n';
import type { IUiSettingsClient } from '@kbn/core/public';
import { type LogRateHistogramItem } from '@kbn/aiops-log-rate-analysis';
import { MULTILAYER_TIME_AXIS_STYLE } from '@kbn/charts-plugin/common';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';

import { DualBrushAnnotation } from '@kbn/aiops-components';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiText } from '@elastic/eui';
import {
  SingleBrush,
  getSingleBrushWindowParameters,
  getSnappedSingleBrushWindowParameters,
} from './single_brush';

// TODO Consolidate with similar component `DocumentCountChartWithBrush` in
// x-pack/packages/ml/aiops_components/src/document_count_chart/document_count_chart.tsx

declare global {
  interface Window {
    /**
     * Flag used to enable debugState on elastic charts
     */
    _echDebugStateFlag?: boolean;
  }
}

interface TimeFilterRange {
  from: number;
  to: number;
}

/**
 * Brush settings
 */
export interface BrushSettings {
  /**
   * Optional label name for brush
   */
  label?: string;
  /**
   * Optional style for brush
   */
  annotationStyle?: RectAnnotationSpec['style'];
  /**
   * Optional width for brush
   */
  badgeWidth?: number;
}

/**
 * Callback function which gets called when the brush selection has changed
 *
 * @param windowParameters Brush selection time ranges.
 * @param force Force update
 */
export type BrushSelectionUpdateHandler = (
  windowParameters: SingleBrushWindowParameters,
  force: boolean
) => void;

/**
 * Props for document count chart
 */
export interface DocumentCountChartProps {
  id?: string;
  /** List of Kibana services that are required as dependencies */
  dependencies: {
    data: DataPublicPluginStart;
    charts: ChartsPluginStart;
    fieldFormats: FieldFormatsStart;
    uiSettings: IUiSettingsClient;
  };
  /** Optional callback for handling brush selection updates */
  brushSelectionUpdateHandler?: BrushSelectionUpdateHandler;
  /** Optional width */
  width?: number;
  /** Optional chart height */
  height?: number;
  /** Data chart points */
  chartPoints: LogRateHistogramItem[];
  /** Data chart points split */
  chartPointsSplit?: LogRateHistogramItem[];
  /** Start time range for the chart */
  timeRangeEarliest: number;
  /** Ending time range for the chart */
  timeRangeLatest: number;
  /** Time interval for the document count buckets */
  interval: number;
  /** Label to name the adjustedChartPointsSplit histogram */
  chartPointsSplitLabel: string;
  /** Whether or not brush has been reset */
  isBrushCleared: boolean;
  /** Timestamp for start of initial analysis */
  autoAnalysisStart?: number | SingleBrushWindowParameters;
  /** Optional style to override bar chart  */
  barStyleAccessor?: BarStyleAccessor;
  /** Optional color override for the default bar color for charts */
  barColorOverride?: string;
  /** Optional color override for the highlighted bar color for charts */
  barHighlightColorOverride?: string;
  /** Optional settings override for the 'brush' brush */
  brush?: BrushSettings;
  /** Optional data-test-subject */
  dataTestSubj?: string;
}

const SPEC_ID = 'document_count';

enum VIEW_MODE {
  ZOOM = 'zoom',
  BRUSH = 'brush',
}

export interface SingleBrushWindowParameters {
  /** Time range minimum value */
  min: number;
  /** Time range maximum value */
  max: number;
}

/**
 * Document count chart with draggable brushes to select time ranges
 * by default use `Baseline` and `Deviation` for the badge names
 *
 * @param props DocumentCountChart component props
 * @returns The DocumentCountChart component.
 */
export const DocumentCountChartWithBrush: FC<DocumentCountChartProps> = (props) => {
  const {
    id,
    dataTestSubj,
    dependencies,
    brushSelectionUpdateHandler,
    width,
    height,
    chartPoints,
    chartPointsSplit,
    timeRangeEarliest,
    timeRangeLatest,
    interval,
    chartPointsSplitLabel,
    isBrushCleared,
    autoAnalysisStart,
    barColorOverride,
    barStyleAccessor,
    barHighlightColorOverride,
    brush = {},
  } = props;

  const { data, uiSettings, fieldFormats, charts } = dependencies;

  const chartBaseTheme = charts.theme.useChartsBaseTheme();

  const xAxisFormatter = fieldFormats.deserialize({ id: 'date' });
  const useLegacyTimeAxis = uiSettings.get('visualization:useLegacyTimeAxis', false);

  const overallSeriesName = i18n.translate('xpack.dataVisualizer.dataDriftt.seriesLabel', {
    defaultMessage: 'document count',
  });

  const overallSeriesNameWithSplit = i18n.translate(
    'xpack.dataVisualizer.dataDrifttSplit.seriesLabel',
    {
      defaultMessage: 'Other document count',
    }
  );

  // TODO Let user choose between ZOOM and BRUSH mode.
  const [viewMode] = useState<VIEW_MODE>(VIEW_MODE.BRUSH);

  const hasNoData = useMemo(
    () =>
      (chartPoints === undefined || chartPoints.length < 1) &&
      (chartPointsSplit === undefined ||
        (Array.isArray(chartPointsSplit) && chartPointsSplit.length < 1)),
    [chartPoints, chartPointsSplit]
  );

  const adjustedChartPoints = useMemo(() => {
    // Display empty chart when no data in range and no split data to show
    if (hasNoData) return [{ time: timeRangeEarliest, value: 0 }];

    // If chart has only one bucket
    // it won't show up correctly unless we add an extra data point
    if (chartPoints.length === 1) {
      return [
        ...chartPoints,
        { time: interval ? Number(chartPoints[0].time) + interval : timeRangeEarliest, value: 0 },
      ];
    }
    return chartPoints;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartPoints, timeRangeEarliest, timeRangeLatest, interval]);

  const adjustedChartPointsSplit = useMemo(() => {
    // Display empty chart when no data in range
    if (hasNoData) return [{ time: timeRangeEarliest, value: 0 }];

    // If chart has only one bucket
    // it won't show up correctly unless we add an extra data point
    if (Array.isArray(chartPointsSplit) && chartPointsSplit.length === 1) {
      return [
        ...chartPointsSplit,
        {
          time: interval ? Number(chartPointsSplit[0].time) + interval : timeRangeEarliest,
          value: 0,
        },
      ];
    }
    return chartPointsSplit;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartPointsSplit, timeRangeEarliest, timeRangeLatest, interval]);

  const snapTimestamps = useMemo(() => {
    const timestamps: number[] = [];
    let n = timeRangeEarliest;

    while (n <= timeRangeLatest + interval) {
      timestamps.push(n);
      n += interval;
    }

    return timestamps;
  }, [timeRangeEarliest, timeRangeLatest, interval]);

  const timefilterUpdateHandler = useCallback(
    (range: TimeFilterRange) => {
      data.query.timefilter.timefilter.setTime({
        from: moment(range.from).toISOString(),
        to: moment(range.to).toISOString(),
        mode: 'absolute',
      });
    },
    [data]
  );

  const onBrushEnd = ({ x }: XYBrushEvent) => {
    if (!x) {
      return;
    }
    const [from, to] = x;
    timefilterUpdateHandler({ from, to });
  };

  const timeZone = getTimeZone(uiSettings);

  const [originalWindowParameters, setOriginalWindowParameters] = useState<
    SingleBrushWindowParameters | undefined
  >();
  const [windowParameters, setWindowParameters] = useState<
    SingleBrushWindowParameters | undefined
  >();

  const triggerAnalysis = useCallback(
    (startRange: number | SingleBrushWindowParameters) => {
      if (viewMode === VIEW_MODE.ZOOM && typeof startRange === 'number') {
        const range: TimeFilterRange = {
          from: startRange,
          to: startRange + interval,
        };

        timefilterUpdateHandler(range);
      } else if (viewMode === VIEW_MODE.BRUSH) {
        if (
          originalWindowParameters === undefined &&
          windowParameters === undefined &&
          adjustedChartPoints !== undefined
        ) {
          const wp =
            typeof startRange === 'number'
              ? getSingleBrushWindowParameters(
                  startRange + interval / 2,
                  timeRangeEarliest,
                  timeRangeLatest + interval
                )
              : startRange;
          const wpSnap = getSnappedSingleBrushWindowParameters(wp, snapTimestamps);
          setOriginalWindowParameters(wpSnap);
          setWindowParameters(wpSnap);

          if (brushSelectionUpdateHandler !== undefined) {
            brushSelectionUpdateHandler(wpSnap, true);
          }
        }
      }
    },
    [
      interval,
      timeRangeEarliest,
      timeRangeLatest,
      snapTimestamps,
      originalWindowParameters,
      setWindowParameters,
      brushSelectionUpdateHandler,
      adjustedChartPoints,
      timefilterUpdateHandler,
      viewMode,
      windowParameters,
    ]
  );

  const onElementClick: ElementClickListener = useCallback(
    ([elementData]) => {
      if (brushSelectionUpdateHandler === undefined) {
        return;
      }
      const startRange = (elementData as XYChartElementEvent)[0].x;

      triggerAnalysis(startRange);
    },
    [triggerAnalysis, brushSelectionUpdateHandler]
  );

  useEffect(() => {
    if (autoAnalysisStart !== undefined) {
      triggerAnalysis(autoAnalysisStart);
    }
  }, [triggerAnalysis, autoAnalysisStart]);

  useEffect(() => {
    if (isBrushCleared && originalWindowParameters !== undefined) {
      setOriginalWindowParameters(undefined);
      setWindowParameters(undefined);
    }
  }, [isBrushCleared, originalWindowParameters]);

  function onWindowParametersChange(wp: SingleBrushWindowParameters) {
    if (brushSelectionUpdateHandler === undefined) {
      return;
    }
    setWindowParameters(wp);
    brushSelectionUpdateHandler(wp, false);
  }

  const [mlBrushWidth, setMlBrushWidth] = useState<number>();
  const [mlBrushMarginLeft, setMlBrushMarginLeft] = useState<number>();

  useEffect(() => {
    if (viewMode !== VIEW_MODE.BRUSH) {
      setOriginalWindowParameters(undefined);
      setWindowParameters(undefined);
    }
  }, [viewMode]);

  const isBrushVisible =
    originalWindowParameters &&
    windowParameters &&
    mlBrushMarginLeft &&
    mlBrushWidth &&
    mlBrushWidth > 0;

  const barColor = barColorOverride ? [barColorOverride] : undefined;
  const barHighlightColor = barHighlightColorOverride ? [barHighlightColorOverride] : ['orange'];

  return (
    <>
      {isBrushVisible ? (
        <div className="dataDriftSingleBrush" data-test-subj={`dataDriftSingleBrush-${id}`}>
          <div
            css={{
              marginBottom: '-4px',
            }}
          >
            <SingleBrush
              id={id}
              windowParameters={originalWindowParameters}
              min={timeRangeEarliest}
              max={timeRangeLatest + interval}
              onChange={onWindowParametersChange}
              marginLeft={mlBrushMarginLeft}
              snapTimestamps={snapTimestamps}
              width={mlBrushWidth}
            />
          </div>
        </div>
      ) : (
        <EuiText color="subdued" size="s" textAlign="center">
          <FormattedMessage
            id="xpack.dataVisualizer.dataDrift.dataDriftDocumentCountChart.clickToSelectTimeRangeLabel"
            defaultMessage="Click on a bucket in the chart to select a time range for {id} data"
            values={{ id }}
          />
        </EuiText>
      )}
      <div
        css={{ width: width ?? '100%' }}
        data-test-subj={dataTestSubj ?? 'dataDriftDocumentCountChart'}
      >
        <Chart
          size={{
            width: '100%',
            height: height ?? 120,
          }}
        >
          <Settings
            onBrushEnd={viewMode !== VIEW_MODE.BRUSH ? (onBrushEnd as BrushEndListener) : undefined}
            onElementClick={onElementClick}
            onProjectionAreaChange={({ projection }) => {
              setMlBrushMarginLeft(projection.left);
              setMlBrushWidth(projection.width);
            }}
            baseTheme={chartBaseTheme}
            debugState={window._echDebugStateFlag ?? false}
            showLegend={false}
            showLegendExtra={false}
            locale={i18n.getLocale()}
          />
          <Axis
            id={`data-drift-histogram-left-axis-${id}`}
            position={Position.Left}
            ticks={2}
            integersOnly
          />
          <Axis
            id={`data-drift-histogram-bottom-axis-${id}`}
            position={Position.Bottom}
            showOverlappingTicks={true}
            tickFormat={(value) => xAxisFormatter.convert(value)}
            labelFormat={useLegacyTimeAxis ? undefined : () => ''}
            timeAxisLayerCount={useLegacyTimeAxis ? 0 : 2}
            style={useLegacyTimeAxis ? {} : MULTILAYER_TIME_AXIS_STYLE}
          />
          {adjustedChartPoints?.length && (
            <HistogramBarSeries
              id={SPEC_ID}
              name={chartPointsSplit ? overallSeriesNameWithSplit : overallSeriesName}
              xScaleType={ScaleType.Time}
              yScaleType={ScaleType.Linear}
              xAccessor="time"
              yAccessors={['value']}
              stackAccessors={['true']}
              data={adjustedChartPoints}
              timeZone={timeZone}
              color={barColor}
              yNice
              styleAccessor={barStyleAccessor}
            />
          )}
          {adjustedChartPointsSplit?.length && (
            <HistogramBarSeries
              id={`${SPEC_ID}_split`}
              name={chartPointsSplitLabel}
              xScaleType={ScaleType.Time}
              yScaleType={ScaleType.Linear}
              xAccessor="time"
              yAccessors={['value']}
              stackAccessors={['true']}
              data={adjustedChartPointsSplit}
              timeZone={timeZone}
              color={barHighlightColor}
              yNice
            />
          )}
          {windowParameters && (
            <>
              <DualBrushAnnotation
                id="data-drift-annotation"
                min={windowParameters.min}
                max={windowParameters.max}
                style={brush.annotationStyle}
              />
            </>
          )}
        </Chart>
      </div>
    </>
  );
};
