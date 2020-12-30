/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Middleware } from 'redux';
import { State } from '../../../types';
// @ts-expect-error untyped local
import { fetchAllRenderables } from '../actions/elements';
import { setRefreshInterval } from '../actions/workpad';
// @ts-expect-error untyped local
import { appUnload } from '../actions/app';
import { inFlightComplete } from '../actions/resolved_args';
import { getInFlight } from '../selectors/resolved_args';
import { getRefreshInterval } from '../selectors/workpad';
import { setRefreshInterval as setAppStateRefreshInterval } from '../../lib/app_state';
import { createTimeInterval } from '../../lib/time_interval';

export const workpadRefresh: Middleware<{}, State> = ({ dispatch, getState }) => (next) => {
  let refreshTimeout: number | undefined;
  let refreshInterval = 0;

  function updateWorkpad() {
    cancelDelayedUpdate();

    if (refreshInterval === 0) {
      return;
    }

    // check the request in flight status
    const inFlightActive = getInFlight(getState());
    if (inFlightActive) {
      // if requests are in-flight, start the refresh delay again
      startDelayedUpdate();
    } else {
      // update the elements on the workpad
      dispatch(fetchAllRenderables());
    }
  }

  function cancelDelayedUpdate() {
    clearTimeout(refreshTimeout);
    refreshTimeout = undefined;
  }

  function startDelayedUpdate() {
    if (!refreshTimeout) {
      clearTimeout(refreshTimeout); // cancel any pending update requests
      refreshTimeout = window.setTimeout(() => {
        updateWorkpad();
      }, refreshInterval);
    }
  }

  return (action) => {
    const previousRefreshInterval = getRefreshInterval(getState());
    next(action);

    refreshInterval = getRefreshInterval(getState());

    // when in-flight requests are finished, update the workpad after a given delay
    if (action.type === inFlightComplete.toString() && refreshInterval > 0) {
      startDelayedUpdate();
    } // create new update request

    // This middleware creates or destroys an interval that will cause workpad elements to update
    if (
      action.type === setRefreshInterval.toString() &&
      previousRefreshInterval !== refreshInterval
    ) {
      // update the refresh interval
      refreshInterval = action.payload;

      setAppStateRefreshInterval(createTimeInterval(refreshInterval));

      // clear any pending timeout
      cancelDelayedUpdate();

      // if interval is larger than 0, start the delayed update
      if (refreshInterval > 0) {
        startDelayedUpdate();
      }
    }

    if (action.type === appUnload.toString()) {
      cancelDelayedUpdate();
    }
  };
};
