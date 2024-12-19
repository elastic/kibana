/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { scaleTime } from 'd3-scale';
import * as React from 'react';
import styled from '@emotion/styled';
import { COLOR_MODES_STANDARD, useEuiFontSize } from '@elastic/eui';
import { useKibanaTimeZoneSetting } from '../../../hooks/use_kibana_time_zone_setting';
import { getTimeLabelFormat } from './time_label_formatter';

interface TimeRulerProps {
  end: number;
  height: number;
  start: number;
  tickCount: number;
  width: number;
}

const useZonedDate = (timestamp: number) => {
  const timeZone = useKibanaTimeZoneSetting();

  const options = timeZone !== 'local' ? { timeZone } : undefined;
  return new Date(new Date(timestamp).toLocaleString('en-US', options));
};

export const TimeRuler: React.FC<TimeRulerProps> = ({ end, height, start, tickCount, width }) => {
  const startWithOffset = useZonedDate(start);
  const endWithOffset = useZonedDate(end);

  const yScale = scaleTime().domain([startWithOffset, endWithOffset]).range([0, height]);

  const ticks = yScale.ticks(tickCount);
  const formatTick = yScale.tickFormat(
    tickCount,
    getTimeLabelFormat(startWithOffset.getTime(), endWithOffset.getTime())
  );

  return (
    <g>
      {ticks.map((tick, tickIndex) => {
        const y = yScale(tick) ?? 0;

        return (
          <g key={`tick${tickIndex}`}>
            <TimeRulerTickLabel x={0} y={y - 4}>
              {formatTick(tick)}
            </TimeRulerTickLabel>
            <TimeRulerGridLine x1={0} y1={y} x2={width} y2={y} />
          </g>
        );
      })}
    </g>
  );
};

TimeRuler.displayName = 'TimeRuler';

const TimeRulerTickLabel = styled.text`
  font-size: ${() => useEuiFontSize('xxxs').fontSize};
  line-height: ${() => useEuiFontSize('s').lineHeight};
  fill: ${(props) => props.theme.euiTheme.colors.textSubdued};
  user-select: none;
  pointer-events: none;
`;

const TimeRulerGridLine = styled.line`
  stroke: ${(props) =>
    props.theme.colorMode === COLOR_MODES_STANDARD.dark
      ? props.theme.euiTheme.colors.darkestShade
      : props.theme.euiTheme.colors.darkShade};
  stroke-opacity: 0.5;
  stroke-width: 1px;
`;
