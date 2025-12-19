/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

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
      {segments?.length ? (
        <div
          css={css`
            box-sizing: border-box;
            position: relative;
            height: ${euiTheme.size.s};
            top: ${euiTheme.size.s};
            min-width: 2px;
            background-color: transparent;
            display: flex;
            flex-direction: row;
          `}
        >
          {segments.map((segment) => (
            <div
              key={segment.id}
              css={css`
                box-sizing: border-box;
                position: absolute;
                height: ${euiTheme.size.s};
                left: ${segment.left * 100}%;
                width: ${segment.width * 100}%;
                min-width: 2px;
                background-color: ${segment.color};
              `}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
