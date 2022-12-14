/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dispatch, MiddlewareAPI, Action } from '@reduxjs/toolkit';
import { LensGetState, LensStoreDeps } from '.';
import { setToggleFullscreen } from './lens_slice';

/** cancels updates to the store that don't change the state */
export const fullscreenMiddleware = (storeDeps: LensStoreDeps) => (store: MiddlewareAPI) => {
  return (next: Dispatch) => (action: Action) => {
    if (setToggleFullscreen.match(action)) {
      const isFullscreen = (store.getState as LensGetState)().lens.isFullscreenDatasource;
      storeDeps.lensServices.chrome.setIsVisible(Boolean(isFullscreen));
    }
    next(action);
  };
};
