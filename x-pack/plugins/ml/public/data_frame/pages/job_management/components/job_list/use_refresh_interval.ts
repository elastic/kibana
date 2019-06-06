/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';

import { timefilter } from 'ui/timefilter';

import {
  DEFAULT_REFRESH_INTERVAL_MS,
  MINIMUM_REFRESH_INTERVAL_MS,
} from '../../../../../../common/constants/jobs_list';

import { GetJobs } from './job_service/get_jobs';

export const useRefreshInterval = (
  getJobs: GetJobs,
  setBlockRefresh: React.Dispatch<React.SetStateAction<boolean>>
) => {
  useEffect(() => {
    let jobsRefreshInterval: null | number = null;

    timefilter.disableTimeRangeSelector();
    timefilter.enableAutoRefreshSelector();

    initAutoRefresh();
    initAutoRefreshUpdate();

    function initAutoRefresh() {
      const { value } = timefilter.getRefreshInterval();
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

    function initAutoRefreshUpdate() {
      // update the interval if it changes
      timefilter.on('refreshIntervalUpdate', () => {
        setAutoRefresh();
      });
    }

    function setAutoRefresh() {
      const { value, pause } = timefilter.getRefreshInterval();
      if (pause) {
        clearRefreshInterval();
      } else {
        setRefreshInterval(value);
      }
      getJobs(true);
    }

    function setRefreshInterval(interval: number) {
      clearRefreshInterval();
      if (interval >= MINIMUM_REFRESH_INTERVAL_MS) {
        setBlockRefresh(false);
        const intervalId = window.setInterval(() => {
          getJobs();
        }, interval);
        jobsRefreshInterval = intervalId;
      }
    }

    function clearRefreshInterval() {
      setBlockRefresh(true);
      if (jobsRefreshInterval !== null) {
        window.clearInterval(jobsRefreshInterval);
      }
    }

    // useEffect cleanup
    return () => {
      clearRefreshInterval();
    };
  }, []); // [] as comparator makes sure this only runs once
};
