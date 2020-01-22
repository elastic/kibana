/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { scale } from '../lib/vector2';
import { animatePanning } from './camera/methods';
import { processNodePositionsAndEdgeLineSegments } from './selectors';
import { ResolverState, ProcessEvent } from '../types';

export function animateProcessIntoView(
  state: ResolverState,
  startTime: Date,
  process: ProcessEvent
): ResolverState {
  const { processNodePositions } = processNodePositionsAndEdgeLineSegments(state);
  const position = processNodePositions.get(process);
  if (position) {
    return {
      ...state,
      camera: animatePanning(state.camera, startTime, scale(position, -1)),
    };
  }
  return state;
}
