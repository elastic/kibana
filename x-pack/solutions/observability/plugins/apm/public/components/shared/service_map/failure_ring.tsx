/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEuiFontSize, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { getFailureLevel, useFailureColor } from './failure_level';

const RING_WIDTH = 5;
/** The shortest arc drawn, in pixels, so a small share of failures stays visible. */
const MIN_ARC = 4;

/**
 * Inside a node, a ring whose arc is the share of failed requests, from the top clockwise,
 * coloured by how serious it is, and what the node says in its centre. The node's border keeps
 * its own meaning (anomaly).
 */
export function FailureRing({
  size,
  failedRate,
  requestCount,
  children,
}: {
  /** The inner size of the node the ring sits in, in pixels. */
  size: number;
  /** Share of failed requests, 0 to 1. No arc when unknown or none. */
  failedRate?: number | null;
  /** Requests the rate is over: a rate on a few requests isn't coloured. */
  requestCount?: number;
  children?: React.ReactNode;
}) {
  const { euiTheme } = useEuiTheme();
  const { fontSize } = useEuiFontSize('xs');
  const level = getFailureLevel(failedRate, requestCount);
  const color = useFailureColor(level);
  const radius = size / 2 - RING_WIDTH;
  const circumference = 2 * Math.PI * radius;
  const share = typeof failedRate === 'number' ? Math.min(1, Math.max(0, failedRate)) : 0;

  return (
    <div
      css={css`
        position: relative;
        width: ${size}px;
        height: ${size}px;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
      `}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
        css={css`
          position: absolute;
          inset: 0;
          transform: rotate(-90deg);
        `}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={euiTheme.colors.backgroundBaseSubdued}
          strokeWidth={RING_WIDTH}
        />
        {color && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={RING_WIDTH}
            strokeLinecap="round"
            strokeDasharray={`${Math.max(MIN_ARC, share * circumference)} ${circumference}`}
            data-test-subj="serviceMapNodeFailureArc"
          />
        )}
      </svg>
      <span
        css={css`
          position: relative;
          font-size: ${fontSize};
          font-weight: ${euiTheme.font.weight.medium};
          color: ${euiTheme.colors.textParagraph};
        `}
      >
        {children}
      </span>
    </div>
  );
}
