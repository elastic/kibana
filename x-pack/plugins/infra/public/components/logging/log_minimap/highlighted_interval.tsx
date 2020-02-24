/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';

import { euiStyled } from '../../../../../observability/public';

interface HighlightedIntervalProps {
  className?: string;
  getPositionOfTime: (time: number) => number;
  start: number;
  end: number;
  width: number;
  target: number | null;
}

export const HighlightedInterval: React.FC<HighlightedIntervalProps> = ({
  className,
  end,
  getPositionOfTime,
  start,
  width,
  target,
}) => {
  const yStart = getPositionOfTime(start);
  const yEnd = getPositionOfTime(end);
  const yTarget = target && getPositionOfTime(target);

  return (
    <>
      {yTarget && (
        <HighlightTargetMarker
          className={className}
          x1={0}
          x2={width / 3}
          y1={yTarget}
          y2={yTarget}
        />
      )}
      <HighlightPolygon
        className={className}
        points={` ${width / 3},${yStart} ${width},${yStart} ${width},${yEnd}  ${width / 3},${yEnd}`}
      />
    </>
  );
};

HighlightedInterval.displayName = 'HighlightedInterval';

const HighlightTargetMarker = euiStyled.line`
  stroke: ${props => props.theme.eui.euiColorPrimary};
  stroke-width: 1;
`;

const HighlightPolygon = euiStyled.polygon`
  fill: ${props => props.theme.eui.euiColorPrimary};
  fill-opacity: 0.3;
  stroke: ${props => props.theme.eui.euiColorPrimary};
  stroke-width: 1;
`;
