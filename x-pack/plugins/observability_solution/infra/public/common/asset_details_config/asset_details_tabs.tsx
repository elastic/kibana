/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBetaBadge } from '@elastic/eui';
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

const metricsTab: Tab = {
  id: ContentTabIds.METRICS,
  name: i18n.translate('xpack.infra.nodeDetails.tabs.metrics.title', {
    defaultMessage: 'Metrics',
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
    <EuiBetaBadge
      label={i18n.translate('xpack.infra.customDashboards.technicalPreviewBadgeLabel', {
        defaultMessage: 'Technical preview',
      })}
      tooltipContent={i18n.translate(
        'xpack.infra.customDashboards.technicalPreviewBadgeDescription',
        {
          defaultMessage:
            'This functionality is in technical preview and may be changed or removed completely in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.',
        }
      )}
      iconType="beaker"
      size="s"
      style={{ verticalAlign: 'middle' }}
    />
  ),
};

const linkToApmTab: Tab = {
  id: ContentTabIds.LINK_TO_APM,
  name: i18n.translate('xpack.infra.assetDetails.tabs.linkToApm', {
    defaultMessage: 'APM',
  }),
};

export const hostDetailsTabs: Tab[] = [
  overviewTab,
  metadataTab,
  metricsTab,
  processesTab,
  profilingTab,
  logsTab,
  anomaliesTab,
  osqueryTab,
  dashboardsTab,
];
export const hostDetailsFlyoutTabs: Tab[] = [...hostDetailsTabs, linkToApmTab];

// The profiling tab would be added in next iteration
export const containerDetailsTabs: Tab[] = [overviewTab, metadataTab, metricsTab, logsTab];
export const containerDetailsFlyoutTabs: Tab[] = [
  overviewTab,
  metadataTab,
  metricsTab,
  logsTab,
  linkToApmTab,
];

export const getAssetDetailsTabs = (type: string): Tab[] => {
  switch (type) {
    case 'host':
      return hostDetailsTabs;
    case 'container':
      return containerDetailsTabs;
    default:
      return [];
  }
};

export const getAssetDetailsFlyoutTabs = (type: string): Tab[] => {
  switch (type) {
    case 'host':
      return hostDetailsFlyoutTabs;
    case 'container':
      return containerDetailsFlyoutTabs;
    default:
      return [];
  }
};
