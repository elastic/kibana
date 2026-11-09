/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';

/**
 * A thin outline in the map's background colour around each letter, as maps draw their labels:
 * lines stop at the text's edge instead of crossing it, and still show between the words.
 */
export function textHaloStyles(backgroundColor: string) {
  const offsets = [
    [-1, -1],
    [0, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
  ];
  return css`
    text-shadow: ${[
      ...offsets.map(([x, y]) => `${x}px ${y}px 0 ${backgroundColor}`),
      `0 0 3px ${backgroundColor}`,
    ].join(', ')};
  `;
}
