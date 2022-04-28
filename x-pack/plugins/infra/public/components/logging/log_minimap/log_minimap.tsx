/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { scaleLinear } from 'd3-scale';
import * as React from 'react';

import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { LogEntryTime } from '../../../../common/log_entry';
import { DensityChart } from './density_chart';
import { HighlightedInterval } from './highlighted_interval';
import { SearchMarkers } from './search_markers';
import { TimeRuler } from './time_ruler';
import {
  LogEntriesSummaryBucket,
  LogEntriesSummaryHighlightsBucket,
} from '../../../../common/http_api';

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

interface LogMinimapState {
  target: number | null;
  timeCursorY: number;
}

// Wide enough to fit "September"
const TIMERULER_WIDTH = 50;

function calculateYScale(start: number | null, end: number | null, height: number) {
  return scaleLinear()
    .domain([start || 0, end || 0])
    .range([0, height]);
}

export class LogMinimap extends React.Component<LogMinimapProps, LogMinimapState> {
  constructor(props: LogMinimapProps) {
    super(props);
    this.state = {
      timeCursorY: 0,
      target: props.target,
    };
  }

  public handleClick: React.MouseEventHandler<SVGSVGElement> = (event) => {
    const minimapTop = event.currentTarget.getBoundingClientRect().top;
    const clickedYPosition = event.clientY - minimapTop;

    const clickedTime = Math.floor(this.getYScale().invert(clickedYPosition));

    this.props.jumpToTarget({
      tiebreaker: 0,
      time: clickedTime,
    });
  };

  public getYScale = () => {
    const { start, end, height } = this.props;
    return calculateYScale(start, end, height);
  };

  public getPositionOfTime = (time: number) => {
    return this.getYScale()(time);
  };

  private updateTimeCursor: React.MouseEventHandler<SVGSVGElement> = (event) => {
    const svgPosition = event.currentTarget.getBoundingClientRect();
    const timeCursorY = event.clientY - svgPosition.top;

    this.setState({ timeCursorY });
  };

  public render() {
    const {
      start,
      end,
      className,
      height,
      highlightedInterval,
      jumpToTarget,
      summaryBuckets,
      summaryHighlightBuckets,
      width,
    } = this.props;
    const { timeCursorY, target } = this.state;
    const [minTime, maxTime] = calculateYScale(start, end, height).domain();
    const tickCount = height ? Math.floor(height / 50) : 12;

    return (
      <MinimapWrapper
        className={className}
        height={height}
        preserveAspectRatio="none"
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        onClick={this.handleClick}
        onMouseMove={this.updateTimeCursor}
      >
        <MinimapBorder x1={TIMERULER_WIDTH} x2={TIMERULER_WIDTH} y1={0} y2={height} />
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
            end={highlightedInterval.end}
            getPositionOfTime={this.getPositionOfTime}
            start={highlightedInterval.start}
            targetWidth={TIMERULER_WIDTH}
            width={width}
            target={target}
          />
        ) : null}
        <TimeCursor x1={TIMERULER_WIDTH} x2={width} y1={timeCursorY} y2={timeCursorY} />
      </MinimapWrapper>
    );
  }
}

const MinimapBorder = euiStyled.line`
  stroke: ${(props) => props.theme.eui.euiColorMediumShade};
  stroke-width: 1px;
`;

const TimeCursor = euiStyled.line`
  pointer-events: none;
  stroke-width: 1px;
  stroke: ${(props) =>
    props.theme.darkMode
      ? props.theme.eui.euiColorDarkestShade
      : props.theme.eui.euiColorDarkShade};
`;

const MinimapWrapper = euiStyled.svg`
  cursor: pointer;
  fill: ${(props) => props.theme.eui.euiColorEmptyShade};
  & ${TimeCursor} {
    visibility: hidden;
  }
  &:hover ${TimeCursor} {
    visibility: visible;
  }
`;
