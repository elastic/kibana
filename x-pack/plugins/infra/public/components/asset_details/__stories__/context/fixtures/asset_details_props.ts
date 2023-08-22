/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { type AssetDetailsProps, FlyoutTabIds, type Tab } from '../../../types';

const links: AssetDetailsProps['links'] = ['alertRule', 'nodeDetails', 'apmServices'];
const tabs: Tab[] = [
  {
    id: FlyoutTabIds.OVERVIEW,
    name: i18n.translate('xpack.infra.nodeDetails.tabs.overview.title', {
      defaultMessage: 'Overview',
    }),
  },
  {
    id: FlyoutTabIds.LOGS,
    name: i18n.translate('xpack.infra.nodeDetails.tabs.logs', {
      defaultMessage: 'Logs',
    }),
  },
  {
    id: FlyoutTabIds.METADATA,
    name: i18n.translate('xpack.infra.metrics.nodeDetails.tabs.metadata', {
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
    id: FlyoutTabIds.ANOMALIES,
    name: i18n.translate('xpack.infra.nodeDetails.tabs.anomalies', {
      defaultMessage: 'Anomalies',
    }),
  },
  {
    id: FlyoutTabIds.LINK_TO_APM,
    name: i18n.translate('xpack.infra.infra.nodeDetails.apmTabLabel', {
      defaultMessage: 'APM',
    }),
  },
];

export const assetDetailsProps: AssetDetailsProps = {
  asset: {
    name: 'host1',
    id: 'host1',
  },
  overrides: {
    metadata: {
      showActionsColumn: true,
    },
  },
  assetType: 'host',
  renderMode: {
    mode: 'page',
  },
  dateRange: {
    from: '2023-04-09T11:07:49Z',
    to: '2023-04-09T11:23:49Z',
  },
  tabs,
  links,
  metricAlias: 'metrics-*',
};
