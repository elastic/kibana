/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Service for obtaining data for the ML Results dashboards.

import chrome from 'ui/chrome';

import { http } from 'plugins/ml/services/http_service';

const basePath = chrome.addBasePath('/api/ml');

export const jobs = {
  forceStartDatafeeds(datafeedIds, start, end) {
    return http({
      url: `${basePath}/jobs/force_start_datafeeds`,
      method: 'POST',
      data: {
        datafeedIds,
        start,
        end
      }
    });
  },

  stopDatafeeds(datafeedIds) {
    return http({
      url: `${basePath}/jobs/stop_datafeeds`,
      method: 'POST',
      data: {
        datafeedIds,
      }
    });
  }
};
