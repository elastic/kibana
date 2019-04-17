/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';

import euiStyled from '../../../../../../common/eui_styled_components';

interface HighlightedIntervalProps {
  className?: string;
  getPositionOfTime: (time: number) => number;
  start: number;
  end: number;
  width: number;
}

export const HighlightedInterval: React.SFC<HighlightedIntervalProps> = ({
  className,
  end,
  getPositionOfTime,
  start,
  width,
}) => {
  const yStart = getPositionOfTime(start);
  const yEnd = getPositionOfTime(end);

  return (
    <HighlightPolygon
      className={className}
      points={`0,${yStart} ${width},${yStart} ${width},${yEnd} 0,${yEnd}`}
    />
  );
};

HighlightedInterval.displayName = 'HighlightedInterval';

const HighlightPolygon = euiStyled.polygon`
  fill: ${props => props.theme.eui.euiColorPrimary};
  fill-opacity: 0.3;
  stroke: ${props => props.theme.eui.euiColorPrimary};
  stroke-width: 1;
`;
