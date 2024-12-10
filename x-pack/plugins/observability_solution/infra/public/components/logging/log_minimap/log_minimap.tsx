/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LogEntriesSummaryBucket,
  LogEntriesSummaryHighlightsBucket,
  LogEntryTime,
} from '@kbn/logs-shared-plugin/common';
import { scaleLinear } from 'd3-scale';
import moment from 'moment';
import * as React from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { useState } from 'react';
import { DensityChart } from './density_chart';
import { HighlightedInterval } from './highlighted_interval';
import { SearchMarkers } from './search_markers';
import { TimeRuler } from './time_ruler';

interface Interval {
  end: number;
  start: number;
}

interface LogMinimapProps {
  className?: string;
  height: number;
  highlightedInterval: Interval | null;
  jumpToTarget: (params: LogEntryTime) => any;
  summaryBuckets: LogEntriesSummaryBucket[];
  summaryHighlightBuckets?: LogEntriesSummaryHighlightsBucket[];
  target: number | null;
  start: number | null;
  end: number | null;
  width: number;
}

// Wide enough to fit "September"
const TIMERULER_WIDTH = 50;

function calculateYScale(start: number | null, end: number | null, height: number) {
  return scaleLinear()
    .domain([start || 0, end || 0])
    .range([0, height]);
}

export const LogMinimap = ({
  start,
  end,
  className,
  height,
  highlightedInterval,
  jumpToTarget,
  summaryBuckets,
  summaryHighlightBuckets,
  width,
  target,
}: LogMinimapProps) => {
  const [timeCursorY, setTimeCursorY] = useState<number>(0);
  const theme = useEuiTheme();

  const handleClick: React.MouseEventHandler<SVGSVGElement> = (event) => {
    const minimapTop = event.currentTarget.getBoundingClientRect().top;
    const clickedYPosition = event.clientY - minimapTop;

    const clickedTime = Math.floor(getYScale().invert(clickedYPosition));

    jumpToTarget({
      tiebreaker: 0,
      time: moment(clickedTime).toISOString(),
    });
  };

  const getYScale = () => {
    return calculateYScale(start, end, height);
  };

  const getPositionOfTime = (time: number) => {
    return getYScale()(time) ?? 0;
  };

  const updateTimeCursor: React.MouseEventHandler<SVGSVGElement> = (event) => {
    const svgPosition = event.currentTarget.getBoundingClientRect();

    setTimeCursorY(event.clientY - svgPosition.top);
  };

  const [minTime, maxTime] = calculateYScale(start, end, height).domain();
  const tickCount = height ? Math.floor(height / 50) : 12;

  return (
    <svg
      className={className}
      height={height}
      preserveAspectRatio="none"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      onClick={handleClick}
      onMouseMove={updateTimeCursor}
      css={css`
        cursor: pointer;
        fill: ${theme.euiTheme.colors.emptyShade};
        & line.logs-time-cursor {
          visibility: hidden;
        }
        &:hover line.logs-time-cursor {
          visibility: visible;
        }
      `}
    >
      <line
        x1={TIMERULER_WIDTH}
        x2={TIMERULER_WIDTH}
        y1={0}
        y2={height}
        css={css`
          stroke: ${theme.euiTheme.colors.mediumShade};
          stroke-width: 1px;
        `}
      />
      <TimeRuler
        start={minTime}
        end={maxTime}
        width={TIMERULER_WIDTH}
        height={height}
        tickCount={tickCount}
      />
      <g transform={`translate(${TIMERULER_WIDTH}, 0)`}>
        <DensityChart
          buckets={summaryBuckets}
          start={minTime}
          end={maxTime}
          width={width - TIMERULER_WIDTH}
          height={height}
        />

        <SearchMarkers
          buckets={summaryHighlightBuckets || []}
          start={minTime}
          end={maxTime}
          width={width - TIMERULER_WIDTH}
          height={height}
          jumpToTarget={jumpToTarget}
        />
      </g>

      {highlightedInterval ? (
        <HighlightedInterval
          end={moment(highlightedInterval.end).valueOf()}
          getPositionOfTime={getPositionOfTime}
          start={moment(highlightedInterval.start).valueOf()}
          targetWidth={TIMERULER_WIDTH}
          width={width}
          target={target}
        />
      ) : null}
      <line
        className="logs-time-cursor"
        x1={TIMERULER_WIDTH}
        x2={width}
        y1={timeCursorY}
        y2={timeCursorY}
        css={css`
          pointer-events: none;
          stroke-width: 1px;
          stroke: ${theme.colorMode === 'DARK'
            ? theme.euiTheme.colors.darkestShade
            : theme.euiTheme.colors.darkShade};
        `}
      />
    </svg>
  );
};
