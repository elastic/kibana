/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OverlayStart } from 'src/core/public';
import { CanvasServiceFactory } from '.';

export type OverlayService = OverlayStart;

export const overlayServiceFactory: CanvasServiceFactory<OverlayService> = (setup, start) => {
  const { overlays } = start;

  return overlays;
};
