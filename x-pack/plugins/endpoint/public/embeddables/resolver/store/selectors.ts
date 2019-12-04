/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as cameraSelectors from './camera/selectors';
import { ResolverState } from '../types';

export const worldToRaster = composeSelectors(cameraStateSelector, cameraSelectors.worldToRaster);

export const rasterToWorld = composeSelectors(cameraStateSelector, cameraSelectors.rasterToWorld);

export const scale = composeSelectors(cameraStateSelector, cameraSelectors.scale);

export const userIsPanning = composeSelectors(cameraStateSelector, cameraSelectors.userIsPanning);

function cameraStateSelector(state: ResolverState) {
  return state.camera;
}

function composeSelectors<OuterState, InnerState, ReturnValue>(
  selector: (state: OuterState) => InnerState,
  secondSelector: (state: InnerState) => ReturnValue
): (state: OuterState) => ReturnValue {
  return state => secondSelector(selector(state));
}
