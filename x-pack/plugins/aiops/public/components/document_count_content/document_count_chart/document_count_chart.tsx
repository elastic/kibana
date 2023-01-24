/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import moment from 'moment';

import {
  Axis,
  BrushEndListener,
  Chart,
  ElementClickListener,
  HistogramBarSeries,
  Position,
  ScaleType,
  Settings,
  XYChartElementEvent,
  XYBrushEvent,
} from '@elastic/charts';

import { i18n } from '@kbn/i18n';
import { IUiSettingsClient } from '@kbn/core/public';
import { DualBrush, DualBrushAnnotation } from '@kbn/aiops-components';
import { getSnappedWindowParameters, getWindowParameters } from '@kbn/aiops-utils';
import type { WindowParameters } from '@kbn/aiops-utils';
import { MULTILAYER_TIME_AXIS_STYLE } from '@kbn/charts-plugin/common';

import { useAiopsAppContext } from '../../../hooks/use_aiops_app_context';

import { BrushBadge } from './brush_badge';

declare global {
  interface Window {
    /**
     * Flag used to enable debugState on elastic charts
     */
    _echDebugStateFlag?: boolean;
  }
}

export interface DocumentCountChartPoint {
  time: number | string;
  value: number;
}

interface DocumentCountChartProps {
  brushSelectionUpdateHandler?: (d: WindowParameters, force: boolean) => void;
  width?: number;
  chartPoints: DocumentCountChartPoint[];
  chartPointsSplit?: DocumentCountChartPoint[];
  timeRangeEarliest: number;
  timeRangeLatest: number;
  interval: number;
  chartPointsSplitLabel: string;
  isBrushCleared: boolean;
}

const SPEC_ID = 'document_count';

const BADGE_HEIGHT = 20;
const BADGE_WIDTH = 75;

enum VIEW_MODE {
  ZOOM = 'zoom',
  BRUSH = 'brush',
}

function getTimezone(uiSettings: IUiSettingsClient) {
  if (uiSettings.isDefault('dateFormat:tz')) {
    const detectedTimezone = moment.tz.guess();
    if (detectedTimezone) return detectedTimezone;
    else return moment().format('Z');
  } else {
    return uiSettings.get('dateFormat:tz', 'Browser');
  }
}

function getBaselineBadgeOverflow(
  windowParametersAsPixels: WindowParameters,
  baselineBadgeWidth: number
) {
  const { baselineMin, baselineMax, deviationMin } = windowParametersAsPixels;

  const baselineBrushWidth = baselineMax - baselineMin;
  const baselineBadgeActualMax = baselineMin + baselineBadgeWidth;
  return deviationMin < baselineBadgeActualMax
    ? Math.max(0, baselineBadgeWidth - baselineBrushWidth)
    : 0;
}

export const DocumentCountChart: FC<DocumentCountChartProps> = ({
  brushSelectionUpdateHandler,
  width,
  chartPoints,
  chartPointsSplit,
  timeRangeEarliest,
  timeRangeLatest,
  interval,
  chartPointsSplitLabel,
  isBrushCleared,
}) => {
  const { data, uiSettings, fieldFormats, charts } = useAiopsAppContext();

  const chartTheme = charts.theme.useChartsTheme();
  const chartBaseTheme = charts.theme.useChartsBaseTheme();

  const xAxisFormatter = fieldFormats.deserialize({ id: 'date' });
  const useLegacyTimeAxis = uiSettings.get('visualization:useLegacyTimeAxis', false);

  const overallSeriesName = i18n.translate(
    'xpack.aiops.dataGrid.field.documentCountChart.seriesLabel',
    {
      defaultMessage: 'document count',
    }
  );

  const overallSeriesNameWithSplit = i18n.translate(
    'xpack.aiops.dataGrid.field.documentCountChartSplit.seriesLabel',
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
    (ranges: { from: number; to: number }) => {
      data.query.timefilter.timefilter.setTime({
        from: moment(ranges.from).toISOString(),
        to: moment(ranges.to).toISOString(),
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

  const onElementClick: ElementClickListener = ([elementData]) => {
    if (brushSelectionUpdateHandler === undefined) {
      return;
    }
    const startRange = (elementData as XYChartElementEvent)[0].x;

    const range = {
      from: startRange,
      to: startRange + interval,
    };

    if (viewMode === VIEW_MODE.ZOOM) {
      timefilterUpdateHandler(range);
    } else {
      if (
        typeof startRange === 'number' &&
        originalWindowParameters === undefined &&
        windowParameters === undefined &&
        adjustedChartPoints !== undefined
      ) {
        const wp = getWindowParameters(
          startRange + interval / 2,
          timeRangeEarliest,
          timeRangeLatest + interval
        );
        const wpSnap = getSnappedWindowParameters(wp, snapTimestamps);
        setOriginalWindowParameters(wpSnap);
        setWindowParameters(wpSnap);
        brushSelectionUpdateHandler(wpSnap, true);
      }
    }
  };

  const timeZone = getTimezone(uiSettings);

  const [originalWindowParameters, setOriginalWindowParameters] = useState<
    WindowParameters | undefined
  >();
  const [windowParameters, setWindowParameters] = useState<WindowParameters | undefined>();
  const [windowParametersAsPixels, setWindowParametersAsPixels] = useState<
    WindowParameters | undefined
  >();

  useEffect(() => {
    if (isBrushCleared && originalWindowParameters !== undefined) {
      setOriginalWindowParameters(undefined);
      setWindowParameters(undefined);
    }
  }, [isBrushCleared, originalWindowParameters]);

  function onWindowParametersChange(wp: WindowParameters, wpPx: WindowParameters) {
    if (brushSelectionUpdateHandler === undefined) {
      return;
    }
    setWindowParameters(wp);
    setWindowParametersAsPixels(wpPx);
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

  // Avoid overlap of brush badges when the brushes are quite narrow.
  const baselineBadgeOverflow = windowParametersAsPixels
    ? getBaselineBadgeOverflow(windowParametersAsPixels, BADGE_WIDTH)
    : 0;
  const baselineBadgeMarginLeft =
    (mlBrushMarginLeft ?? 0) + (windowParametersAsPixels?.baselineMin ?? 0);

  return (
    <>
      {isBrushVisible && (
        <div className="aiopsHistogramBrushes" data-test-subj="aiopsHistogramBrushes">
          <div css={{ height: BADGE_HEIGHT }}>
            <BrushBadge
              label={i18n.translate('xpack.aiops.documentCountChart.baselineBadgeLabel', {
                defaultMessage: 'Baseline',
              })}
              marginLeft={baselineBadgeMarginLeft - baselineBadgeOverflow}
              timestampFrom={windowParameters.baselineMin}
              timestampTo={windowParameters.baselineMax}
              width={BADGE_WIDTH}
            />
            <BrushBadge
              label={i18n.translate('xpack.aiops.documentCountChart.deviationBadgeLabel', {
                defaultMessage: 'Deviation',
              })}
              marginLeft={mlBrushMarginLeft + (windowParametersAsPixels?.deviationMin ?? 0)}
              timestampFrom={windowParameters.deviationMin}
              timestampTo={windowParameters.deviationMax}
              width={BADGE_WIDTH}
            />
          </div>
          <div
            css={{
              'margin-bottom': '-4px',
            }}
          >
            <DualBrush
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
      )}
      <div css={{ width: width ?? '100%' }} data-test-subj="aiopsDocumentCountChart">
        <Chart
          size={{
            width: '100%',
            height: 120,
          }}
        >
          <Settings
            onBrushEnd={viewMode !== VIEW_MODE.BRUSH ? (onBrushEnd as BrushEndListener) : undefined}
            onElementClick={onElementClick}
            onProjectionAreaChange={({ projection }) => {
              setMlBrushMarginLeft(projection.left);
              setMlBrushWidth(projection.width);
            }}
            theme={chartTheme}
            baseTheme={chartBaseTheme}
            debugState={window._echDebugStateFlag ?? false}
            showLegend={false}
            showLegendExtra={false}
          />
          <Axis id="aiops-histogram-left-axis" position={Position.Left} ticks={2} integersOnly />
          <Axis
            id="aiops-histogram-bottom-axis"
            position={Position.Bottom}
            showOverlappingTicks={true}
            tickFormat={(value) => xAxisFormatter.convert(value)}
            // temporary fix to reduce horizontal chart margin until fixed in Elastic Charts itself
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
              data={adjustedChartPoints}
              timeZone={timeZone}
              yNice
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
              data={adjustedChartPointsSplit}
              timeZone={timeZone}
              color={['orange']}
              yNice
            />
          )}
          {windowParameters && (
            <>
              <DualBrushAnnotation
                id="aiopsBaseline"
                min={windowParameters.baselineMin}
                max={windowParameters.baselineMax}
              />
              <DualBrushAnnotation
                id="aiopsDeviation"
                min={windowParameters.deviationMin}
                max={windowParameters.deviationMax}
              />
            </>
          )}
        </Chart>
      </div>
    </>
  );
};
