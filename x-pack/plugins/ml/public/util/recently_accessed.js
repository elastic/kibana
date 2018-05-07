/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



// utility functions for managing which links get added to kibana's recently accessed list

import { recentlyAccessed } from 'ui/persisted_log';

export function addItemToRecentlyAccessed(page, itemId, url) {
  let pageLabel = '';
  let id = `ml-job-${itemId}`;

  switch (page) {
    case 'explorer':
      pageLabel = 'Anomaly Explorer';
      break;
    case 'timeseriesexplorer':
      pageLabel = 'Single Metric Viewer';
      break;
    case 'jobs/new_job/datavisualizer':
      pageLabel = 'Data Visualizer';
      id = `ml-datavisualizer-${itemId}`;
      break;
    default:
      console.error('addItemToRecentlyAccessed - No page specified');
      return;
      break;
  }

  url = `ml#/${page}/${url}`;

  recentlyAccessed.add(url, `ML - ${itemId} - ${pageLabel}`, id);
}
