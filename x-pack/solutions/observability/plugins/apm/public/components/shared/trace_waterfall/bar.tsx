/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { BarSegments } from './bar_segments';

export interface BarSegment {
  id: string;
  left: number;
  width: number;
  color: string;
}

export function Bar({
  width,
  left,
  color,
  segments,
}: {
  width: number;
  left: number;
  color: string;
  segments?: BarSegment[];
}) {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css`
        position: relative;
        height: ${euiTheme.size.base};
        background-color: ${color};
        width: ${width}%;
        margin-left: ${left}%;
      `}
    >
      {segments?.length ? <BarSegments segments={segments} /> : null}
    </div>
  );
}
