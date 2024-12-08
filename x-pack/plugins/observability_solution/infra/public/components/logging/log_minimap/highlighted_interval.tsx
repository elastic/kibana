/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';

import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { type EuiThemeComputed, useEuiTheme } from '@elastic/eui';

interface HighlightedIntervalProps {
  className?: string;
  getPositionOfTime: (time: number) => number;
  start: number;
  end: number;
  targetWidth: number;
  width: number;
  target: number | null;
}

export const HighlightedInterval: React.FC<HighlightedIntervalProps> = ({
  className,
  end,
  getPositionOfTime,
  start,
  targetWidth,
  width,
  target,
}) => {
  const { euiTheme } = useEuiTheme();
  const yStart = getPositionOfTime(start);
  const yEnd = getPositionOfTime(end);
  const yTarget = target && getPositionOfTime(target);

  return (
    <>
      {yTarget && (
        <HighlightTargetMarker
          euiTheme={euiTheme}
          className={className}
          x1={0}
          x2={targetWidth}
          y1={yTarget}
          y2={yTarget}
        />
      )}
      <HighlightPolygon
        euiTheme={euiTheme}
        className={className}
        points={` ${targetWidth},${yStart} ${width},${yStart} ${width},${yEnd}  ${targetWidth},${yEnd}`}
      />
    </>
  );
};

HighlightedInterval.displayName = 'HighlightedInterval';

const HighlightTargetMarker = euiStyled.line<{ euiTheme: EuiThemeComputed }>`
  stroke: ${(props) => props.euiTheme.colors.primary};
  stroke-width: 1;
`;

const HighlightPolygon = euiStyled.polygon<{ euiTheme: EuiThemeComputed }>`
  fill: ${(props) => props.euiTheme.colors.primary};
  fill-opacity: 0.3;
  stroke: ${(props) => props.euiTheme.colors.primary};
  stroke-width: 1;
`;
