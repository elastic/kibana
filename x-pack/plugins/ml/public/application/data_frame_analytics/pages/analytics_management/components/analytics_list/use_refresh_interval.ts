/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useMlKibana } from '../../../../../contexts/kibana';
import { useUrlState } from '../../../../../util/url_state';

import {
  DEFAULT_REFRESH_INTERVAL_MS,
  MINIMUM_REFRESH_INTERVAL_MS,
} from '../../../../../../../common/constants/jobs_list';

import { useRefreshAnalyticsList } from '../../../../common';

export const useRefreshInterval = (
  setBlockRefresh: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const { services } = useMlKibana();
  const [globalState] = useUrlState('_g');
  const { timefilter } = services.data.query.timefilter;

  const { refresh } = useRefreshAnalyticsList();
  useEffect(() => {
    let analyticsRefreshInterval: null | number = null;

    const refreshIntervalSubscription = timefilter
      .getRefreshIntervalUpdate$()
      .subscribe(setAutoRefresh);
    timefilter.disableTimeRangeSelector();
    timefilter.enableAutoRefreshSelector();

    initAutoRefresh();

    function initAutoRefresh() {
      const interval = globalState?.refreshInterval ?? timefilter.getRefreshInterval();
      const { value } = interval;

      if (value === 0) {
        // the auto refresher starts in an off state
        // so switch it on and set the interval to 30s
        timefilter.setRefreshInterval({
          pause: false,
          value: DEFAULT_REFRESH_INTERVAL_MS,
        });
      }

      setAutoRefresh();
    }

    function setAutoRefresh() {
      const { value, pause } = timefilter.getRefreshInterval();
      if (pause) {
        clearRefreshInterval();
      } else {
        setRefreshInterval(value);
      }
      refresh();
    }

    function setRefreshInterval(interval: number) {
      clearRefreshInterval();
      if (interval >= MINIMUM_REFRESH_INTERVAL_MS) {
        setBlockRefresh(false);
        const intervalId = window.setInterval(() => {
          refresh();
        }, interval);
        analyticsRefreshInterval = intervalId;
      }
    }

    function clearRefreshInterval() {
      setBlockRefresh(true);
      if (analyticsRefreshInterval !== null) {
        window.clearInterval(analyticsRefreshInterval);
      }
    }

    // useEffect cleanup
    return () => {
      refreshIntervalSubscription.unsubscribe();
      clearRefreshInterval();
    };
  }, []); // [] as comparator makes sure this only runs once
};
