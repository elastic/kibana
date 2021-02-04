/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setFullscreen } from '../../lib/fullscreen';
import { setFullscreen as setAppStateFullscreen } from '../../lib/app_state';
import { setFullscreen as setFullscreenAction } from '../actions/transient';
import { getFullscreen } from '../selectors/app';

export const fullscreen = ({ getState }) => (next) => (action) => {
  // execute the default action
  next(action);

  // pass current state's fullscreen info to the fullscreen service
  if (action.type === setFullscreenAction.toString()) {
    const fullscreen = getFullscreen(getState());
    setFullscreen(fullscreen);
    setAppStateFullscreen(fullscreen);
  }
};
