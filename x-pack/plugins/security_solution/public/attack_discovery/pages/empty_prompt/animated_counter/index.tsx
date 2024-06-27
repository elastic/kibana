/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import * as d3 from 'd3';
import React, { useRef, useEffect } from 'react';

interface Props {
  animationDurationMs?: number;
  count: number;
}

const AnimatedCounterComponent: React.FC<Props> = ({ animationDurationMs = 1000 * 1, count }) => {
  const { euiTheme } = useEuiTheme();
  const d3Ref = useRef(null);
  const zero = 0; // counter starts at zero

  useEffect(() => {
    if (d3Ref.current) {
      d3.select(d3Ref.current).selectAll('*').remove();
      const svg = d3.select(d3Ref.current).append('svg');

      const text = svg
        .append('text')
        .attr('x', 3)
        .attr('y', 26)
        .attr('fill', euiTheme.colors.text)
        .text(zero);

      text
        .transition()
        .tween('text', function (this: SVGTextElement) {
          const selection = d3.select(this);
          const current = Number(d3.select(this).text());
          const interpolator = d3.interpolateNumber(current, count);

          return (t) => {
            selection.text(Math.round(interpolator(t)));
          };
        })
        .duration(animationDurationMs);
    }
  }, [animationDurationMs, count, euiTheme.colors.text]);

  return (
    <svg
      css={css`
        height: 32px;
        margin-right: ${euiTheme.size.xs};
        width: ${count < 100 ? 40 : 53}px;
      `}
      data-test-subj="animatedCounter"
      ref={d3Ref}
    />
  );
};

export const AnimatedCounter = React.memo(AnimatedCounterComponent);
