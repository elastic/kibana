/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

export interface CriticalityDonutProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

const DEFAULT_SIZE = 100;
const DEFAULT_STROKE = 18;

export const CriticalityDonut = ({
  score,
  size = DEFAULT_SIZE,
  strokeWidth = DEFAULT_STROKE,
}: CriticalityDonutProps) => {
  const { euiTheme } = useEuiTheme();

  const { radius, circumference, dashOffset, trackColor, arcColor, labelColor } = useMemo(() => {
    const r = (size - strokeWidth) / 2;
    const c = 2 * Math.PI * r;
    const clamped = Math.min(100, Math.max(0, score));
    const offset = c * (1 - clamped / 100);

    let arc: string;
    if (clamped >= 80) {
      arc = euiTheme.colors.severity.danger;
    } else if (clamped >= 60) {
      arc = euiTheme.colors.severity.warning;
    } else if (clamped >= 40) {
      arc = euiTheme.colors.primary;
    } else {
      arc = euiTheme.colors.severity.success;
    }

    return {
      radius: r,
      circumference: c,
      dashOffset: offset,
      trackColor: euiTheme.colors.severity.unknown,
      arcColor: arc,
      labelColor: euiTheme.colors.vis.euiColorVisText7,
    };
  }, [
    euiTheme.colors.primary,
    euiTheme.colors.severity.danger,
    euiTheme.colors.severity.success,
    euiTheme.colors.severity.warning,
    euiTheme.colors.severity.unknown,
    euiTheme.colors.vis.euiColorVisText7,
    score,
    size,
    strokeWidth,
  ]);

  const clamped = Math.min(100, Math.max(0, score));

  const label = i18n.translate('xpack.nightshift.sigeventsOverview.criticalityDonut.ariaLabel', {
    defaultMessage: 'Severity score {score} out of 100',
    values: { score: clamped },
  });

  return (
    <div
      css={css`
        position: relative;
        width: ${size}px;
        height: ${size}px;
        flex-shrink: 0;
      `}
      role="img"
      aria-label={label}
      data-test-subj="sigeventsOverviewCriticalityDonut"
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={arcColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div
        css={css`
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        `}
      >
        <span
          css={css`
            color: ${labelColor};
            font-family: ${euiTheme.font.familyCode};
            font-size: ${Math.max(size * 0.36, 8)}px;
            font-weight: 400;
            line-height: 1;
          `}
        >
          {clamped}
        </span>
      </div>
    </div>
  );
};
