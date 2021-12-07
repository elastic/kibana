/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mix } from './utils/math.js';

const REFERENCE_AF_LENGTH = 16.67; // ms
const REFERENCE_Y_RECURRENCE_ALPHA = 0.1;
const TWEEN_DONE_EPSILON = 0.001;

export const domainTween = (interactionState, deltaT, targetMin, targetMax) => {
  const { niceDomainMin: currentMin, niceDomainMax: currentMax } = interactionState;

  // pure logic
  const speedExp = Math.pow((currentMax - currentMin) / (targetMax - targetMin), 0.2); // speeds up big decreases
  const advance =
    1 - (1 - REFERENCE_Y_RECURRENCE_ALPHA) ** ((speedExp * deltaT) / REFERENCE_AF_LENGTH);
  const min = Number.isFinite(currentMin) ? mix(currentMin, targetMin, advance) : targetMin;
  const max = Number.isFinite(currentMax) ? mix(currentMax, targetMax, advance) : targetMax;
  const tweenIncomplete = Math.abs(1 - (max - min) / (targetMax - targetMin)) > TWEEN_DONE_EPSILON;

  // remember
  interactionState.niceDomainMin = min;
  interactionState.niceDomainMax = max;

  return tweenIncomplete;
};
