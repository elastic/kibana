/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { IBasePath } from '@kbn/core/public';
import moment from 'moment';
import { APIReturnType } from '../../../../../services/rest/create_call_apm_api';
import { getInfraHref } from '../../../../shared/links/infra_link';
import {
  Action,
  getNonEmptySections,
  SectionRecord,
} from '../../../../shared/transaction_action_menu/sections_helper';

type InstaceDetails =
  APIReturnType<'GET /internal/apm/services/{serviceName}/service_overview_instances/details/{serviceNodeName}'>;

function getInfraMetricsQuery(timestamp?: string) {
  if (!timestamp) {
    return { from: 0, to: 0 };
  }
  const timeInMilliseconds = new Date(timestamp).getTime();
  const fiveMinutes = moment.duration(5, 'minutes').asMilliseconds();

  return {
    from: timeInMilliseconds - fiveMinutes,
    to: timeInMilliseconds + fiveMinutes,
  };
}

export function getMenuSections({
  instanceDetails,
  basePath,
  onFilterByInstanceClick,
  metricsHref,
}: {
  instanceDetails: InstaceDetails;
  basePath: IBasePath;
  onFilterByInstanceClick: () => void;
  metricsHref: string;
}) {
  const podId = instanceDetails.kubernetes?.pod?.uid;
  const containerId = instanceDetails.container?.id;
  const time = instanceDetails['@timestamp']
    ? new Date(instanceDetails['@timestamp']).valueOf()
    : undefined;
  const infraMetricsQuery = getInfraMetricsQuery(instanceDetails['@timestamp']);

  const podActions: Action[] = [
    {
      key: 'podLogs',
      label: i18n.translate(
        'xpack.apm.serviceOverview.instancesTable.actionMenus.podLogs',
        { defaultMessage: 'Pod logs' }
      ),
      href: getInfraHref({
        app: 'logs',
        basePath,
        path: `/link-to/pod-logs/${podId}`,
        query: { time },
      }),
      condition: !!podId,
    },
    {
      key: 'podMetrics',
      label: i18n.translate(
        'xpack.apm.serviceOverview.instancesTable.actionMenus.podMetrics',
        { defaultMessage: 'Pod metrics' }
      ),
      href: getInfraHref({
        app: 'metrics',
        basePath,
        path: `/link-to/pod-detail/${podId}`,
        query: infraMetricsQuery,
      }),
      condition: !!podId,
    },
  ];

  const containerActions: Action[] = [
    {
      key: 'containerLogs',
      label: i18n.translate(
        'xpack.apm.serviceOverview.instancesTable.actionMenus.containerLogs',
        { defaultMessage: 'Container logs' }
      ),
      href: getInfraHref({
        app: 'logs',
        basePath,
        path: `/link-to/container-logs/${containerId}`,
        query: { time },
      }),
      condition: !!containerId,
    },
    {
      key: 'containerMetrics',
      label: i18n.translate(
        'xpack.apm.serviceOverview.instancesTable.actionMenus.containerMetrics',
        { defaultMessage: 'Container metrics' }
      ),
      href: getInfraHref({
        app: 'metrics',
        basePath,
        path: `/link-to/container-detail/${containerId}`,
        query: infraMetricsQuery,
      }),
      condition: !!containerId,
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
      label: i18n.translate(
        'xpack.apm.serviceOverview.instancesTable.actionMenus.metrics',
        {
          defaultMessage: 'Metrics',
        }
      ),
      href: metricsHref,
      condition: true,
    },
  ];

  const sectionRecord: SectionRecord = {
    observability: [
      {
        key: 'podDetails',
        title: i18n.translate(
          'xpack.apm.serviceOverview.instancesTable.actionMenus.pod.title',
          {
            defaultMessage: 'Pod details',
          }
        ),
        subtitle: i18n.translate(
          'xpack.apm.serviceOverview.instancesTable.actionMenus.pod.subtitle',
          {
            defaultMessage:
              'View logs and metrics for this pod to get further details.',
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
            defaultMessage:
              'View logs and metrics for this container to get further details.',
          }
        ),
        actions: containerActions,
      },
    ],
    apm: [{ key: 'apm', actions: apmActions }],
  };

  return getNonEmptySections(sectionRecord);
}
