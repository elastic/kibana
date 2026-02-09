/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { IBasePath } from '@kbn/core/public';
import moment from 'moment';
import type { LocatorPublic } from '@kbn/share-plugin/public';
import { type LogsLocatorParams, getNodeQuery, getTimeRange } from '@kbn/logs-shared-plugin/common';
import { findInventoryFields } from '@kbn/metrics-data-access-plugin/common';
import { type AssetDetailsLocator } from '@kbn/observability-shared-plugin/common';
import type { SerializableRecord } from '@kbn/utility-types';
import type { APIReturnType } from '../../../../../services/rest/create_call_apm_api';
import type {
  Action,
  SectionRecord,
} from '../../../../shared/transaction_action_menu/sections_helper';
import { getNonEmptySections } from '../../../../shared/transaction_action_menu/sections_helper';
import { getPodMetricsLink } from '../../../../shared/transaction_action_menu/pod_metrics_utils';

type InstaceDetails =
  APIReturnType<'GET /internal/apm/services/{serviceName}/service_overview_instances/details/{serviceNodeName}'>;

function getInfraMetricsQuery(timestamp?: string) {
  if (!timestamp) {
    return undefined;
  }
  const timeInMilliseconds = new Date(timestamp).getTime();
  const fiveMinutes = moment.duration(5, 'minutes').asMilliseconds();

  return {
    from: new Date(timeInMilliseconds - fiveMinutes).toISOString(),
    to: new Date(timeInMilliseconds + fiveMinutes).toISOString(),
  };
}

export function getMenuSections({
  instanceDetails,
  basePath,
  onFilterByInstanceClick,
  metricsHref,
  logsLocator,
  assetDetailsLocator,
  discoverLocator,
  infraLinksAvailable,
  metricsIndices,
}: {
  instanceDetails: InstaceDetails;
  basePath: IBasePath;
  onFilterByInstanceClick: () => void;
  metricsHref: string;
  logsLocator: LocatorPublic<LogsLocatorParams>;
  assetDetailsLocator?: AssetDetailsLocator;
  discoverLocator?: LocatorPublic<SerializableRecord>;
  infraLinksAvailable: boolean;
  metricsIndices?: string;
}) {
  const podId = instanceDetails.kubernetes?.pod?.uid;
  const containerId = instanceDetails.container?.id;
  const time = instanceDetails['@timestamp']
    ? new Date(instanceDetails['@timestamp']).valueOf()
    : undefined;
  const infraMetricsQuery = getInfraMetricsQuery(instanceDetails['@timestamp']);

  const podLogsHref = logsLocator.getRedirectUrl({
    query: getNodeQuery({
      nodeField: findInventoryFields('pod').id,
      nodeId: podId!,
    }),
    timeRange: getTimeRange(time),
  });

  const containerLogsHref = logsLocator.getRedirectUrl({
    query: getNodeQuery({
      nodeField: findInventoryFields('container').id,
      nodeId: containerId!,
    }),
    timeRange: getTimeRange(time),
  });

  const hasContainerLink = !!containerId && !!assetDetailsLocator;

  const podMetricsLink = getPodMetricsLink({
    podId,
    agentName: instanceDetails.agent?.name,
    infraMetricsQuery,
    assetDetailsLocator,
    discoverLocator,
    infraLinksAvailable,
    metricsIndices,
  });

  const podActions: Action[] = [
    {
      key: 'podLogs',
      label: i18n.translate('xpack.apm.serviceOverview.instancesTable.actionMenus.podLogs', {
        defaultMessage: 'Pod logs',
      }),
      href: podLogsHref,
      condition: !!podId,
    },
    {
      key: 'podMetrics',
      label: i18n.translate('xpack.apm.serviceOverview.instancesTable.actionMenus.podMetrics', {
        defaultMessage: 'Pod metrics',
      }),
      href: podMetricsLink,
      condition: !!podMetricsLink,
    },
  ];

  const containerActions: Action[] = [
    {
      key: 'containerLogs',
      label: i18n.translate('xpack.apm.serviceOverview.instancesTable.actionMenus.containerLogs', {
        defaultMessage: 'Container logs',
      }),
      href: containerLogsHref,
      condition: !!containerId,
    },
    {
      key: 'containerMetrics',
      label: i18n.translate(
        'xpack.apm.serviceOverview.instancesTable.actionMenus.containerMetrics',
        { defaultMessage: 'Container metrics' }
      ),
      href: hasContainerLink
        ? assetDetailsLocator.getRedirectUrl({
            entityId: containerId,
            entityType: 'container',
            assetDetails: { dateRange: infraMetricsQuery },
          })
        : undefined,
      condition: hasContainerLink,
    },
  ];

  const apmActions: Action[] = [
    {
      key: 'filterByInstance',
      label: i18n.translate(
        'xpack.apm.serviceOverview.instancesTable.actionMenus.filterByInstance',
        {
          defaultMessage: 'Filter overview by instance',
        }
      ),
      onClick: onFilterByInstanceClick,
      condition: true,
    },
    {
      key: 'analyzeRuntimeMetric',
      label: i18n.translate('xpack.apm.serviceOverview.instancesTable.actionMenus.metrics', {
        defaultMessage: 'Metrics',
      }),
      href: metricsHref,
      condition: true,
    },
  ];

  const sectionRecord: SectionRecord = {
    observability: [
      {
        key: 'podDetails',
        title: i18n.translate('xpack.apm.serviceOverview.instancesTable.actionMenus.pod.title', {
          defaultMessage: 'Pod details',
        }),
        subtitle: i18n.translate(
          'xpack.apm.serviceOverview.instancesTable.actionMenus.pod.subtitle',
          {
            defaultMessage: 'View logs and metrics for this pod to get further details.',
          }
        ),
        actions: podActions,
      },
      {
        key: 'containerDetails',
        title: i18n.translate(
          'xpack.apm.serviceOverview.instancesTable.actionMenus.container.title',
          {
            defaultMessage: 'Container details',
          }
        ),
        subtitle: i18n.translate(
          'xpack.apm.serviceOverview.instancesTable.actionMenus.container.subtitle',
          {
            defaultMessage: 'View logs and metrics for this container to get further details.',
          }
        ),
        actions: containerActions,
      },
    ],
    apm: [{ key: 'apm', actions: apmActions }],
  };

  return getNonEmptySections(sectionRecord);
}
