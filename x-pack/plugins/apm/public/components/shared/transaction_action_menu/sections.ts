/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Location } from 'history';
import { IBasePath } from '@kbn/core/public';
import { isEmpty, pickBy } from 'lodash';
import moment from 'moment';
import url from 'url';
import type { InfraLocators } from '@kbn/infra-plugin/common/locators';
import { Environment } from '../../../../common/environment_rt';
import type { Transaction } from '../../../../typings/es_schemas/ui/transaction';
import { getDiscoverHref } from '../links/discover_links/discover_link';
import { getDiscoverQuery } from '../links/discover_links/discover_transaction_link';
import { getInfraHref } from '../links/infra_link';
import { fromQuery } from '../links/url_helpers';
import { SectionRecord, getNonEmptySections, Action } from './sections_helper';
import { TRACE_ID } from '../../../../common/es_fields/apm';
import { ApmRouter } from '../../routing/apm_route_config';

function getInfraMetricsQuery(transaction: Transaction) {
  const timestamp = new Date(transaction['@timestamp']).getTime();
  const fiveMinutes = moment.duration(5, 'minutes').asMilliseconds();

  return {
    from: timestamp - fiveMinutes,
    to: timestamp + fiveMinutes,
  };
}

export const getSections = ({
  transaction,
  basePath,
  location,
  apmRouter,
  infraLocators,
  infraLinksAvailable,
  rangeFrom,
  rangeTo,
  environment,
}: {
  transaction?: Transaction;
  basePath: IBasePath;
  location: Location;
  apmRouter: ApmRouter;
  infraLocators: InfraLocators;
  infraLinksAvailable: boolean;
  rangeFrom: string;
  rangeTo: string;
  environment: Environment;
}) => {
  if (!transaction) return [];
  const hostName = transaction.host?.hostname;
  const podId = transaction.kubernetes?.pod?.uid;
  const containerId = transaction.container?.id;
  const { nodeLogsLocator, logsLocator } = infraLocators;

  const time = Math.round(transaction.timestamp.us / 1000);
  const infraMetricsQuery = getInfraMetricsQuery(transaction);

  const uptimeLink = url.format({
    pathname: basePath.prepend('/app/uptime'),
    search: `?${fromQuery(
      pickBy(
        {
          dateRangeStart: rangeFrom,
          dateRangeEnd: rangeTo,
          search: `url.domain:"${transaction.url?.domain}"`,
        },
        (val) => !isEmpty(val)
      )
    )}`,
  });

  const podActions: Action[] = [
    {
      key: 'podLogs',
      label: i18n.translate(
        'xpack.apm.transactionActionMenu.showPodLogsLinkLabel',
        { defaultMessage: 'Pod logs' }
      ),
      href: nodeLogsLocator.getRedirectUrl({
        nodeId: podId!,
        nodeType: 'pod',
        time,
      }),
      condition: !!podId,
    },
    {
      key: 'podMetrics',
      label: i18n.translate(
        'xpack.apm.transactionActionMenu.showPodMetricsLinkLabel',
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
        'xpack.apm.transactionActionMenu.showContainerLogsLinkLabel',
        { defaultMessage: 'Container logs' }
      ),
      href: nodeLogsLocator.getRedirectUrl({
        nodeId: containerId!,
        nodeType: 'container',
        time,
      }),
      condition: !!containerId,
    },
    {
      key: 'containerMetrics',
      label: i18n.translate(
        'xpack.apm.transactionActionMenu.showContainerMetricsLinkLabel',
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

  const hostActions: Action[] = [
    {
      key: 'hostLogs',
      label: i18n.translate(
        'xpack.apm.transactionActionMenu.showHostLogsLinkLabel',
        { defaultMessage: 'Host logs' }
      ),
      href: nodeLogsLocator.getRedirectUrl({
        nodeId: hostName!,
        nodeType: 'host',
        time,
      }),
      condition: !!hostName,
    },
    {
      key: 'hostMetrics',
      label: i18n.translate(
        'xpack.apm.transactionActionMenu.showHostMetricsLinkLabel',
        { defaultMessage: 'Host metrics' }
      ),
      href: getInfraHref({
        app: 'metrics',
        basePath,
        path: `/link-to/host-detail/${hostName}`,
        query: infraMetricsQuery,
      }),
      condition: !!hostName,
    },
  ];

  const logActions: Action[] = [
    {
      key: 'traceLogs',
      label: i18n.translate(
        'xpack.apm.transactionActionMenu.showTraceLogsLinkLabel',
        { defaultMessage: 'Trace logs' }
      ),
      href: logsLocator.getRedirectUrl({
        filter: `trace.id:"${transaction.trace.id}" OR (not trace.id:* AND "${transaction.trace.id}")`,
        time,
      }),
      condition: true,
    },
  ];

  const uptimeActions: Action[] = [
    {
      key: 'monitorStatus',
      label: i18n.translate('xpack.apm.transactionActionMenu.viewInUptime', {
        defaultMessage: 'Status',
      }),
      href: uptimeLink,
      condition: !!transaction.url?.domain,
    },
  ];

  const kibanaActions: Action[] = [
    {
      key: 'sampleDocument',
      label: i18n.translate(
        'xpack.apm.transactionActionMenu.viewSampleDocumentLinkLabel',
        {
          defaultMessage: 'View transaction in Discover',
        }
      ),
      href: getDiscoverHref({
        basePath,
        query: getDiscoverQuery(transaction),
        location,
      }),
      condition: true,
    },
  ];

  const serviceMapHref = apmRouter.link('/service-map', {
    query: {
      rangeFrom,
      rangeTo,
      environment,
      kuery: `${TRACE_ID} : "${transaction.trace.id}"`,
      serviceGroup: '',
      comparisonEnabled: false,
    },
  });
  const serviceMapActions: Action[] = [
    {
      key: 'serviceMap',
      label: i18n.translate(
        'xpack.apm.transactionActionMenu.showInServiceMapLinkLabel',
        { defaultMessage: 'Show in service map' }
      ),
      href: serviceMapHref,
      condition: true,
    },
  ];

  const sectionRecord: SectionRecord = {
    observability: [
      ...(infraLinksAvailable
        ? [
            {
              key: 'podDetails',
              title: i18n.translate(
                'xpack.apm.transactionActionMenu.pod.title',
                {
                  defaultMessage: 'Pod details',
                }
              ),
              subtitle: i18n.translate(
                'xpack.apm.transactionActionMenu.pod.subtitle',
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
                'xpack.apm.transactionActionMenu.container.title',
                {
                  defaultMessage: 'Container details',
                }
              ),
              subtitle: i18n.translate(
                'xpack.apm.transactionActionMenu.container.subtitle',
                {
                  defaultMessage:
                    'View logs and metrics for this container to get further details.',
                }
              ),
              actions: containerActions,
            },
            {
              key: 'hostDetails',
              title: i18n.translate(
                'xpack.apm.transactionActionMenu.host.title',
                {
                  defaultMessage: 'Host details',
                }
              ),
              subtitle: i18n.translate(
                'xpack.apm.transactionActionMenu.host.subtitle',
                {
                  defaultMessage:
                    'View host logs and metrics to get further details.',
                }
              ),
              actions: hostActions,
            },
          ]
        : []),

      {
        key: 'traceDetails',
        title: i18n.translate('xpack.apm.transactionActionMenu.trace.title', {
          defaultMessage: 'Trace details',
        }),
        subtitle: i18n.translate(
          'xpack.apm.transactionActionMenu.trace.subtitle',
          {
            defaultMessage: 'View trace logs to get further details.',
          }
        ),
        actions: logActions,
      },
      {
        key: 'statusDetails',
        title: i18n.translate('xpack.apm.transactionActionMenu.status.title', {
          defaultMessage: 'Status details',
        }),
        subtitle: i18n.translate(
          'xpack.apm.transactionActionMenu.status.subtitle',
          {
            defaultMessage: 'View status to get further details.',
          }
        ),
        actions: uptimeActions,
      },
      {
        key: 'serviceMap',
        title: i18n.translate(
          'xpack.apm.transactionActionMenu.serviceMap.title',
          {
            defaultMessage: 'Service Map',
          }
        ),
        subtitle: i18n.translate(
          'xpack.apm.transactionActionMenu.serviceMap.subtitle',
          {
            defaultMessage: 'View service map filtered by this trace.',
          }
        ),
        actions: serviceMapActions,
      },
    ],
    kibana: [{ key: 'kibana', actions: kibanaActions }],
  };

  // Filter out actions that shouldnt be shown and sections without any actions.
  return getNonEmptySections(sectionRecord);
};
