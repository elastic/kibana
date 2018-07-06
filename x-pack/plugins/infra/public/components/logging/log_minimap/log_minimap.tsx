/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { scaleLinear } from 'd3-scale';
import * as React from 'react';
import styled from 'styled-components';

import { LogEntryTime } from '../../../../common/log_entry';
import { SearchSummaryBucket } from '../../../../common/log_search_summary';
import { LogSummaryBucket } from '../../../../common/log_summary';
import { getMillisOfScale, TimeScale } from '../../../../common/time';
import { DensityChart } from './density_chart';
import { HighlightedInterval } from './highlighted_interval';
import { SearchMarkers } from './search_markers';
import { TimeRuler } from './time_ruler';

interface LogMinimapProps {
  className?: string;
  height: number;
  highlightedInterval: {
    end: number | null;
    start: number | null;
  };
  jumpToTarget: (params: LogEntryTime) => any;
  loadedInterval: {
    end: number | null;
    start: number | null;
  };
  reportVisibleInterval: (params: { start: number; end: number }) => any;
  scale: TimeScale;
  summaryBuckets: LogSummaryBucket[];
  searchSummaryBuckets: SearchSummaryBucket[];
  target: number;
  width: number;
}

interface LogMinimapState {
  currentTarget: number;
}

export class LogMinimap extends React.Component<
  LogMinimapProps,
  LogMinimapState
> {
  public readonly state = {
    currentTarget: this.props.target,
  };

  public componentWillReceiveProps(nextProps: LogMinimapProps) {
    if (nextProps.target !== this.props.target) {
      this.setState({
        currentTarget: nextProps.target,
      });
    }
  }

  public handleClick: React.MouseEventHandler<SVGSVGElement> = event => {
    const svgPosition = event.currentTarget.getBoundingClientRect();
    const clickedYPosition = event.clientY - svgPosition.top;
    const clickedTime = Math.floor(this.getYScale().invert(clickedYPosition));

    this.props.jumpToTarget({
      tiebreaker: 0,
      time: clickedTime,
    });
  };

  public getYScale = () => {
    const { height, scale } = this.props;
    const { currentTarget } = this.state;

    const visibleDuration = getMillisOfScale(scale);

    return scaleLinear()
      .domain([
        currentTarget - visibleDuration / 2,
        currentTarget + visibleDuration / 2,
      ])
      .range([0, height]);
  };

  public getPositionOfTime = (time: number) => {
    const { height, scale } = this.props;

    const visibleDuration = getMillisOfScale(scale);
    const [minTime] = this.getYScale().domain();

    return (time - minTime) * height / visibleDuration;
  };

  public updateVisibleInterval = () => {
    const [minTime, maxTime] = this.getYScale().domain();

    this.props.reportVisibleInterval({
      end: Math.ceil(maxTime),
      start: Math.floor(minTime),
    });
  };

  public componentDidUpdate(
    prevProps: LogMinimapProps,
    prevState: LogMinimapState
  ) {
    if (prevState.currentTarget !== this.state.currentTarget) {
      this.updateVisibleInterval();
    }
  }

  public render() {
    const {
      className,
      height,
      highlightedInterval,
      jumpToTarget,
      // loadedInterval,
      summaryBuckets,
      searchSummaryBuckets,
      width,
    } = this.props;

    const [minTime, maxTime] = this.getYScale().domain();

    return (
      <svg
        className={className}
        height={height}
        preserveAspectRatio="none"
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        onClick={this.handleClick}
      >
        <MinimapBackground
          x={width / 2}
          y="0"
          width={width / 2}
          height={height}
        />
        <DensityChart
          buckets={summaryBuckets}
          start={minTime}
          end={maxTime}
          width={width}
          height={height}
        />
        <MinimapBorder x1={width / 2} y1={0} x2={width / 2} y2={height} />
        <TimeRuler
          start={minTime}
          end={maxTime}
          width={width}
          height={height}
          tickCount={12}
        />
        {/*loadedInterval.start !== null && loadedInterval.end !== null ? (
          <HighlightedInterval
            className="minimapHighlightedInterval--light"
            end={loadedInterval.end}
            getPositionOfTime={this.getPositionOfTime}
            start={loadedInterval.start}
            width={0}
          />
        ) : null*/}
        {highlightedInterval.start !== null &&
        highlightedInterval.end !== null ? (
          <HighlightedInterval
            end={highlightedInterval.end}
            getPositionOfTime={this.getPositionOfTime}
            start={highlightedInterval.start}
            width={width}
          />
        ) : null}
        <g transform={`translate(${width * 0.5}, 0)`}>
          <SearchMarkers
            buckets={searchSummaryBuckets}
            start={minTime}
            end={maxTime}
            width={width / 2}
            height={height}
            jumpToTarget={jumpToTarget}
          />
        </g>
      </svg>
    );
  }
}

const MinimapBackground = styled.rect`
  fill: ${props => props.theme.eui.euiColorLightestShade};
`;

const MinimapBorder = styled.line`
  stroke: ${props => props.theme.eui.euiColorMediumShade};
  stroke-width: 1px;
`;
