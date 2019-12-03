/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function userPanned(offset: [number, number]) {
  return {
    type: 'userPanned' as const,
    payload: offset,
  };
}

export function userZoomed(zoomLevel: number) {
  return {
    type: 'userZoomed' as const,
    payload: zoomLevel,
  };
}

type userPannedAction = ReturnType<typeof userPanned>;
type userZoomedAction = ReturnType<typeof userZoomed>;

export type ResolverAction = userPannedAction | userZoomedAction;
