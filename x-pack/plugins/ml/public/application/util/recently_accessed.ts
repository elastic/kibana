/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// utility functions for managing which links get added to kibana's recently accessed list

import { i18n } from '@kbn/i18n';

import type { ChromeRecentlyAccessed } from '@kbn/core/public';
import { getRecentlyAccessed } from './dependency_cache';

export function addItemToRecentlyAccessed(
  page: string,
  itemId: string,
  url: string,
  recentlyAccessedService?: ChromeRecentlyAccessed
) {
  let pageLabel = '';
  let id = `ml-job-${itemId}`;

  switch (page) {
    case 'explorer':
      pageLabel = i18n.translate('xpack.ml.anomalyExplorerPageLabel', {
        defaultMessage: 'Anomaly Explorer',
      });
      break;
    case 'timeseriesexplorer':
      pageLabel = i18n.translate('xpack.ml.singleMetricViewerPageLabel', {
        defaultMessage: 'Single Metric Viewer',
      });
      break;
    case 'jobs/new_job/datavisualizer':
      pageLabel = i18n.translate('xpack.ml.dataVisualizerPageLabel', {
        defaultMessage: 'Data Visualizer',
      });
      id = `ml-datavisualizer-${itemId}`;
      break;
    default:
      // eslint-disable-next-line no-console
      console.error('addItemToRecentlyAccessed - No page specified');
      return;
  }

  const recentlyAccessed = recentlyAccessedService ?? getRecentlyAccessed();
  recentlyAccessed.add(url, `ML - ${itemId} - ${pageLabel}`, id);
}
