/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { animatePanning } from './camera/methods';
import { layout, processEventForID } from './selectors';
import { ResolverState } from '../types';

const animationDuration = 1000;

/**
 * Return new `ResolverState` with the camera animating to focus on `process`.
 */
export function animateProcessIntoView(
  state: ResolverState,
  startTime: number,
  nodeID: string
): ResolverState {
  const process = processEventForID(state)(nodeID);
  if (!process) {
    console.log('no process, bailing');
    return state;
  }
  const { processNodePositions } = layout(state);
  const position = processNodePositions.get(process);
  if (position) {
    console.log('began animation');
    return {
      ...state,
      camera: animatePanning(state.camera, startTime, position, animationDuration),
    };
  }
  console.log('no position, bailing');
  return state;
}
