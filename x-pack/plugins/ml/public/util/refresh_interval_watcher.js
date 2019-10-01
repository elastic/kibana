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
  let listener;

  const onRefreshIntervalChange = () => {
    if (refresher) {
      $timeout.cancel(refresher);
    }
    checkForStartRefresh();
  };

  function init(listenerCallback) {
    listener = listenerCallback;
    timefilter.on('refreshIntervalUpdate', onRefreshIntervalChange);

    // Apply any refresh values set on initialization e.g. in the URL.
    checkForStartRefresh();
  }

  function cancel() {
    $timeout.cancel(refresher);
    timefilter.off('refreshIntervalUpdate', onRefreshIntervalChange);
  }

  function checkForStartRefresh() {
    const interval = timefilter.getRefreshInterval();
    if (interval.value > 0 && !interval.pause) {
      function startRefresh() {
        refresher = $timeout(() => {
          startRefresh();
          listener();
        }, interval.value);
      }
      startRefresh();
    }
  }

  return {
    init,
    cancel
  };
}
