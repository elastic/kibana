/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OverlayStart } from 'src/core/public';
import { CanvasServiceFactory } from '.';

export interface OverlayService {
  openFlyout: OverlayStart['openFlyout'];
  openModal: OverlayStart['openModal'];
}

export const overlayServiceFactory: CanvasServiceFactory<OverlayService> = (_setup, start) => {
  const { openFlyout, openModal } = start.overlays;

  return { openFlyout, openModal };
};
