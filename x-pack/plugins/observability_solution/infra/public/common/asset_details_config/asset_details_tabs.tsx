/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ContentTabIds, type Tab } from '../../components/asset_details/types';

export const commonFlyoutTabs: Tab[] = [
  {
    id: ContentTabIds.OVERVIEW,
    name: i18n.translate('xpack.infra.assetDetails.tabs.overview.title', {
      defaultMessage: 'Overview',
    }),
  },
  {
    id: ContentTabIds.METADATA,
    name: i18n.translate('xpack.infra.assetDetails.tabs.metadata.title', {
      defaultMessage: 'Metadata',
    }),
  },
  {
    id: ContentTabIds.METRICS,
    name: i18n.translate('xpack.infra.assetDetails.tabs.metrics.title', {
      defaultMessage: 'Metrics',
    }),
  },
  {
    id: ContentTabIds.PROCESSES,
    name: i18n.translate('xpack.infra.metrics.assetDetails.tabs.processes', {
      defaultMessage: 'Processes',
    }),
  },
  {
    id: ContentTabIds.PROFILING,
    name: i18n.translate('xpack.infra.metrics.assetDetails.tabs.profiling', {
      defaultMessage: 'Universal Profiling',
    }),
  },
  {
    id: ContentTabIds.LOGS,
    name: i18n.translate('xpack.infra.assetDetails.tabs.logs.title', {
      defaultMessage: 'Logs',
    }),
  },
  {
    id: ContentTabIds.ANOMALIES,
    name: i18n.translate('xpack.infra.assetDetails.tabs.anomalies', {
      defaultMessage: 'Anomalies',
    }),
  },
  {
    id: ContentTabIds.OSQUERY,
    name: i18n.translate('xpack.infra.assetDetails.tabs.osquery', {
      defaultMessage: 'Osquery',
    }),
  },
];
