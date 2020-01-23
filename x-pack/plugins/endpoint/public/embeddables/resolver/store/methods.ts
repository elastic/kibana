/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { translation } from './camera/selectors';
import { scale, distance, applyMatrix3 } from '../lib/vector2';
import { animatePanning } from './camera/methods';
import {
  processNodePositionsAndEdgeLineSegments,
  projectionMatrix as projectionMatrixAtTime,
} from './selectors';
import { ResolverState, ProcessEvent } from '../types';

/**
 * Return new `ResolverState` with the camera animating to focus on `process`.
 */
export function animateProcessIntoView(
  state: ResolverState,
  startTime: Date,
  process: ProcessEvent
): ResolverState {
  const { processNodePositions } = processNodePositionsAndEdgeLineSegments(state);
  const position = processNodePositions.get(process);
  if (position) {
    const currentPosition = translation(state.camera)(startTime);
    /**
     * Move the camera 4 pixels per millisecond
     */
    const projectionMatrix = projectionMatrixAtTime(state)(startTime);
    const duration =
      distance(
        applyMatrix3(currentPosition, projectionMatrix),
        applyMatrix3(position, projectionMatrix)
      ) / 4;

    return {
      ...state,
      camera: animatePanning(state.camera, startTime, scale(position, -1), duration),
    };
  }
  return state;
}
