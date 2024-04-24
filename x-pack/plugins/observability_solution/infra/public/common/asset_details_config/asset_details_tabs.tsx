/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ContentTabIds, type Tab } from '../../components/asset_details/types';

const overviewTab: Tab = {
  id: ContentTabIds.OVERVIEW,
  name: i18n.translate('xpack.infra.nodeDetails.tabs.overview.title', {
    defaultMessage: 'Overview',
  }),
};

const metadataTab: Tab = {
  id: ContentTabIds.METADATA,
  name: i18n.translate('xpack.infra.nodeDetails.tabs.metadata.title', {
    defaultMessage: 'Metadata',
  }),
};

const processesTab: Tab = {
  id: ContentTabIds.PROCESSES,
  name: i18n.translate('xpack.infra.metrics.nodeDetails.tabs.processes', {
    defaultMessage: 'Processes',
  }),
};

const profilingTab: Tab = {
  id: ContentTabIds.PROFILING,
  name: i18n.translate('xpack.infra.metrics.nodeDetails.tabs.profiling', {
    defaultMessage: 'Universal Profiling',
  }),
};

const logsTab: Tab = {
  id: ContentTabIds.LOGS,
  name: i18n.translate('xpack.infra.nodeDetails.tabs.logs.title', {
    defaultMessage: 'Logs',
  }),
};

const anomaliesTab: Tab = {
  id: ContentTabIds.ANOMALIES,
  name: i18n.translate('xpack.infra.nodeDetails.tabs.anomalies', {
    defaultMessage: 'Anomalies',
  }),
};

const osqueryTab: Tab = {
  id: ContentTabIds.OSQUERY,
  name: i18n.translate('xpack.infra.nodeDetails.tabs.osquery', {
    defaultMessage: 'Osquery',
  }),
};

const dashboardsTab: Tab = {
  id: ContentTabIds.DASHBOARDS,
  name: i18n.translate('xpack.infra.infra.nodeDetails.tabs.dashboards', {
    defaultMessage: 'Dashboards',
  }),
  append: (
    <EuiBadge color="accent">
      {i18n.translate('xpack.infra.customDashboards.newLabel', {
        defaultMessage: 'NEW',
      })}
    </EuiBadge>
  ),
};

export const hostDetailsTabs: Tab[] = [
  overviewTab,
  metadataTab,
  processesTab,
  profilingTab,
  logsTab,
  anomaliesTab,
  osqueryTab,
  dashboardsTab,
];

export const containerDetailsTabs: Tab[] = [overviewTab, metadataTab, profilingTab, logsTab];

export const assetDetailsTabs = (type: string): Tab[] => {
  switch (type) {
    case 'host':
      return hostDetailsTabs;
    case 'container':
      return containerDetailsTabs;
    default:
      return [];
  }
};
