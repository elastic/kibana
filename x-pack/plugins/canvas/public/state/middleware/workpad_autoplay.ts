/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Middleware } from 'redux';
import { State } from '../../../types';
import { getFullscreen } from '../selectors/app';
import { getInFlight } from '../selectors/resolved_args';
import { getWorkpad, getPages, getSelectedPageIndex, getAutoplay } from '../selectors/workpad';
// @ts-expect-error untyped local
import { appUnload } from '../actions/app';
// @ts-expect-error untyped local
import { routerProvider } from '../../lib/router_provider';
import { setAutoplayInterval } from '../../lib/app_state';
import { createTimeInterval } from '../../lib/time_interval';

export const workpadAutoplay: Middleware<{}, State> = ({ getState }) => (next) => {
  let playTimeout: number | undefined;
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

    stopAutoUpdate();
    startDelayedUpdate();
  }

  function stopAutoUpdate() {
    clearTimeout(playTimeout); // cancel any pending update requests
    playTimeout = undefined;
  }

  function startDelayedUpdate() {
    if (!playTimeout) {
      stopAutoUpdate();
      playTimeout = window.setTimeout(() => {
        updateWorkpad();
      }, displayInterval);
    }
  }

  return (action) => {
    next(action);

    const isFullscreen = getFullscreen(getState());
    const autoplay = getAutoplay(getState());
    const shouldPlay = isFullscreen && autoplay.enabled && autoplay.interval > 0;
    displayInterval = autoplay.interval;

    // update appState
    if (autoplay.enabled) {
      setAutoplayInterval(createTimeInterval(autoplay.interval));
    } else {
      setAutoplayInterval(null);
    }

    // if interval is larger than 0, start the delayed update
    if (shouldPlay) {
      startDelayedUpdate();
    } else {
      stopAutoUpdate();
    }

    if (action.type === appUnload.toString()) {
      stopAutoUpdate();
    }
  };
};
