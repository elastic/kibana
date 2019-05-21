/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { inFlightComplete } from '../actions/resolved_args';
import { getFullscreen } from '../selectors/app';
import { getInFlight } from '../selectors/resolved_args';
import { getWorkpad, getPages, getSelectedPageIndex, getAutoplay } from '../selectors/workpad';
import { routerProvider } from '../../lib/router_provider';

export const workpadAutoplay = ({ getState }) => next => {
  let playTimeout;
  let displayInterval = 0;

  const router = routerProvider();

  function updateWorkpad() {
    if (displayInterval === 0) {
      return;
    }

    // check the request in flight status
    const inFlightActive = getInFlight(getState());

    // only navigate if no requests are in-flight
    if (!inFlightActive) {
      // update the elements on the workpad
      const workpadId = getWorkpad(getState()).id;
      const pageIndex = getSelectedPageIndex(getState());
      const pageCount = getPages(getState()).length;
      const nextPage = Math.min(pageIndex + 1, pageCount - 1);

      // go to start if on the last page
      if (nextPage === pageIndex) {
        router.navigateTo('loadWorkpad', { id: workpadId, page: 1 });
      } else {
        router.navigateTo('loadWorkpad', { id: workpadId, page: nextPage + 1 });
      }
    }

    startDelayedUpdate();
  }

  function stopAutoUpdate() {
    clearTimeout(playTimeout); // cancel any pending update requests
  }

  function startDelayedUpdate() {
    stopAutoUpdate();
    playTimeout = setTimeout(() => {
      updateWorkpad();
    }, displayInterval);
  }

  return action => {
    next(action);

    const isFullscreen = getFullscreen(getState());
    const autoplay = getAutoplay(getState());
    const shouldPlay = isFullscreen && autoplay.enabled && autoplay.interval > 0;
    displayInterval = autoplay.interval;

    // when in-flight requests are finished, update the workpad after a given delay
    if (action.type === inFlightComplete.toString() && shouldPlay) {
      startDelayedUpdate();
    } // create new update request

    // This middleware creates or destroys an interval that will cause workpad elements to update
    // clear any pending timeout
    stopAutoUpdate();

    // if interval is larger than 0, start the delayed update
    if (shouldPlay) {
      startDelayedUpdate();
    }
  };
};
