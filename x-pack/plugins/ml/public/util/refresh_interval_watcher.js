/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { timefilter } from 'ui/timefilter';

/*
 * Watches for changes to the refresh interval of the page time filter,
 * so that listeners can be notified when the auto-refresh interval has elapsed.
 */

export function refreshIntervalWatcher($timeout) {

  let refresher;

  function init(listener) {

    timefilter.on('refreshIntervalUpdate', (interval) => {
      if (refresher) {
        $timeout.cancel(refresher);
      }
      if (interval.value > 0 && !interval.pause) {
        function startRefresh() {
          refresher = $timeout(() => {
            startRefresh();
            listener();
          }, interval.value);
        }
        startRefresh();
      }
    });
  }

  function cancel() {
    $timeout.cancel(refresher);
  }

  return {
    init,
    cancel
  };
}
