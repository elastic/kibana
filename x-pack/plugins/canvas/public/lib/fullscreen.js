/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { platformService } from '../services';

export const fullscreenClass = 'canvas-isFullscreen';

export function setFullscreen(fullscreen, doc = document) {
  const enabled = Boolean(fullscreen);
  const body = doc.querySelector('body');
  const bodyClassList = body.classList;
  const isFullscreen = bodyClassList.contains(fullscreenClass);

  if (enabled && !isFullscreen) {
    platformService.getService().setFullscreen(false);
    bodyClassList.add(fullscreenClass);
  } else if (!enabled && isFullscreen) {
    bodyClassList.remove(fullscreenClass);
    platformService.getService().setFullscreen(true);
  }
}
