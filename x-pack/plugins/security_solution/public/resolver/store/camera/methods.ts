/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { translation } from './selectors';
import { CameraState, Vector2 } from '../../types';
import { distance } from '../../models/vector2';

/**
 * Return a new `CameraState` with the `animation` property
 * set. The camera will animate to `targetTranslation` over `duration`.
 */
export function animatePanning(
  state: CameraState,
  startTime: number,
  targetTranslation: Vector2,
  duration: number
): CameraState {
  const initialTranslation = translation(state)(startTime);
  const translationDistance = distance(targetTranslation, initialTranslation);

  if (translationDistance === 0) {
    return {
      ...state,
      animation: undefined,
      panning: undefined,
    };
  }

  const nextState: CameraState = {
    ...state,
    /**
     * This cancels panning if any was taking place.
     */
    panning: undefined,
    translationNotCountingCurrentPanning: targetTranslation,
    animation: {
      startTime,
      targetTranslation,
      initialTranslation,
      duration,
    },
  };

  return nextState;
}
