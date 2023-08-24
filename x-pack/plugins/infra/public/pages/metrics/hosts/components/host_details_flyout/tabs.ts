/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FlyoutTabIds, type Tab } from '../../../../../components/asset_details/types';

export const orderedFlyoutTabs: Tab[] = [
  {
    id: FlyoutTabIds.OVERVIEW,
    name: i18n.translate('xpack.infra.nodeDetails.tabs.overview.title', {
      defaultMessage: 'Overview',
    }),
  },
  {
    id: FlyoutTabIds.METADATA,
    name: i18n.translate('xpack.infra.nodeDetails.tabs.metadata.title', {
      defaultMessage: 'Metadata',
    }),
  },
  {
    id: FlyoutTabIds.PROCESSES,
    name: i18n.translate('xpack.infra.metrics.nodeDetails.tabs.processes', {
      defaultMessage: 'Processes',
    }),
  },
  {
    id: FlyoutTabIds.LOGS,
    name: i18n.translate('xpack.infra.nodeDetails.tabs.logs.title', {
      defaultMessage: 'Logs',
    }),
  },
  {
    id: FlyoutTabIds.ANOMALIES,
    name: i18n.translate('xpack.infra.nodeDetails.tabs.anomalies', {
      defaultMessage: 'Anomalies',
    }),
  },
  {
    id: FlyoutTabIds.OSQUERY,
    name: i18n.translate('xpack.infra.nodeDetails.tabs.osquery', {
      defaultMessage: 'Osquery',
    }),
  },
];
