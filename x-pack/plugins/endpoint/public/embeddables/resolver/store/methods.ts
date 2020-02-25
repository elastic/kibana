/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { animatePanning } from './camera/methods';
import { processNodePositionsAndEdgeLineSegments } from './selectors';
import { ResolverState, ProcessEvent } from '../types';

const animationDuration = 1000;

/**
 * Return new `ResolverState` with the camera animating to focus on `process`.
 */
export function animateProcessIntoView(
  state: ResolverState,
  startTime: number,
  process: ProcessEvent
): ResolverState {
  const { processNodePositions } = processNodePositionsAndEdgeLineSegments(state);
  const position = processNodePositions.get(process);
  if (position) {
    return {
      ...state,
      camera: animatePanning(state.camera, startTime, position, animationDuration),
    };
  }
  return state;
}
