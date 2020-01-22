/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { translation } from './selectors';
import { CameraState, Vector2 } from '../../types';

export function animatePanning(
  state: CameraState,
  startTime: Date,
  targetTranslation: Vector2
): CameraState {
  const nextState: CameraState = {
    ...state,
    panning: undefined,
    translationNotCountingCurrentPanning: targetTranslation,
    animation: {
      startTime,
      targetTranslation,
      initialTranslation: translation(state)(startTime),
    },
  };

  return nextState;
}
