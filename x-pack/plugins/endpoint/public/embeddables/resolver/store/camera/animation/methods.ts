/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { easing } from 'ts-easing';
import { clamp } from '../../../lib/math';
import { CameraAnimationState, Vector2 } from '../../../types';
import * as vector2 from '../../../lib/vector2';

export function active(animation: CameraAnimationState, time: Date): boolean {
  return animation.startTime.getTime() + animation.duration >= time.getTime();
}

export function translation(animation: CameraAnimationState, time: Date): Vector2 {
  const delta = vector2.subtract(animation.targetTranslation, animation.initialTranslation);
  const progress = clamp(
    (time.getTime() - animation.startTime.getTime()) / animation.duration,
    0,
    1
  );

  return vector2.add(
    animation.initialTranslation,
    vector2.scale(delta, easing.inOutCubic(progress))
  );
}
