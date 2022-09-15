/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { clamp } from 'lodash';

const MAX_POSITIVE_CHANGE = 2;
const MAX_NEGATIVE_CHANGE = 0.5;

export function getInterpolationValue(foreground: number, background: number | null | undefined) {
  if (background === null || background === undefined) {
    return -1;
  }

  const change = clamp(background / foreground - 1, -MAX_NEGATIVE_CHANGE, MAX_POSITIVE_CHANGE) || 0;

  return change >= 0 ? change / MAX_POSITIVE_CHANGE : change / MAX_NEGATIVE_CHANGE;
}
