/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { Redirect, RouteComponentProps } from 'react-router-dom';
import { UNIDENTIFIED_SERVICE_NODES_LABEL } from '../../../../../common/i18n';
import { SERVICE_NODE_NAME_MISSING } from '../../../../../common/service_nodes';
import { APMRouteDefinition } from '../../../../application/routes';
import { resolveUrlParams } from '../../../../context/UrlParamsContext/resolveUrlParams';
import { toQuery } from '../../../shared/Links/url_helpers';
import { ErrorGroupDetails } from '../../ErrorGroupDetails';
import { Home } from '../../Home';
import { ServiceDetails } from '../../ServiceDetails';
import { ServiceNodeMetrics } from '../../ServiceNodeMetrics';
import { Settings } from '../../Settings';
import { AgentConfigurations } from '../../Settings/AgentConfigurations';
import { AnomalyDetection } from '../../Settings/anomaly_detection';
import { ApmIndices } from '../../Settings/ApmIndices';
import { CustomizeUI } from '../../Settings/CustomizeUI';
import { TraceLink } from '../../TraceLink';
import { TransactionDetails } from '../../TransactionDetails';
import {
  CreateAgentConfigurationRouteHandler,
  EditAgentConfigurationRouteHandler,
} from './route_handlers/agent_configuration';

const metricsBreadcrumb = i18n.translate('xpack.apm.breadcrumb.metricsTitle', {
  defaultMessage: 'Metrics',
});

interface RouteParams {
  serviceName: string;
}

export const renderAsRedirectTo = (to: string) => {
  return ({ location }: RouteComponentProps<RouteParams>) => {
    let resolvedUrl: URL | undefined;

    // Redirect root URLs with a hash to support backward compatibility with URLs
    // from before we switched to the non-hash platform history.
    if (location.pathname === '' && location.hash.length > 0) {
      // We just want the search and pathname so the host doesn't matter
      resolvedUrl = new URL(location.hash.slice(1), 'http://localhost');
      to = resolvedUrl.pathname;
    }

    return (
      <Redirect
        to={{
          ...location,
          hash: '',
          pathname: to,
          search: resolvedUrl ? resolvedUrl.search : location.search,
        }}
      />
    );
  };
};

export const routes: APMRouteDefinition[] = [
  {
    exact: true,
    path: '/',
    render: renderAsRedirectTo('/services'),
    breadcrumb: 'APM',
  },
  {
    exact: true,
    path: '/services',
    component: () => <Home tab="services" />,
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.servicesTitle', {
      defaultMessage: 'Services',
    }),
  },
  {
    exact: true,
    path: '/traces',
    component: () => <Home tab="traces" />,
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.tracesTitle', {
      defaultMessage: 'Traces',
    }),
  },
  {
    exact: true,
    path: '/settings',
    render: renderAsRedirectTo('/settings/agent-configuration'),
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.listSettingsTitle', {
      defaultMessage: 'Settings',
    }),
  },
  {
    exact: true,
    path: '/settings/apm-indices',
    component: () => (
      <Settings>
        <ApmIndices />
      </Settings>
    ),
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.settings.indicesTitle', {
      defaultMessage: 'Indices',
    }),
  },
  {
    exact: true,
    path: '/settings/agent-configuration',
    component: () => (
      <Settings>
        <AgentConfigurations />
      </Settings>
    ),
    breadcrumb: i18n.translate(
      'xpack.apm.breadcrumb.settings.agentConfigurationTitle',
      { defaultMessage: 'Agent Configuration' }
    ),
  },

  {
    exact: true,
    path: '/settings/agent-configuration/create',
    breadcrumb: i18n.translate(
      'xpack.apm.breadcrumb.settings.createAgentConfigurationTitle',
      { defaultMessage: 'Create Agent Configuration' }
    ),
    component: () => <CreateAgentConfigurationRouteHandler />,
  },
  {
    exact: true,
    path: '/settings/agent-configuration/edit',
    breadcrumb: i18n.translate(
      'xpack.apm.breadcrumb.settings.editAgentConfigurationTitle',
      { defaultMessage: 'Edit Agent Configuration' }
    ),
    component: () => <EditAgentConfigurationRouteHandler />,
  },
  {
    exact: true,
    path: '/services/:serviceName',
    breadcrumb: ({ match }) => match.params.serviceName,
    render: (props: RouteComponentProps<RouteParams>) =>
      renderAsRedirectTo(
        `/services/${props.match.params.serviceName}/transactions`
      )(props),
  } as APMRouteDefinition<RouteParams>,
  // errors
  {
    exact: true,
    path: '/services/:serviceName/errors/:groupId',
    component: ErrorGroupDetails,
    breadcrumb: ({ match }) => match.params.groupId,
  } as APMRouteDefinition<{ groupId: string; serviceName: string }>,
  {
    exact: true,
    path: '/services/:serviceName/errors',
    component: () => <ServiceDetails tab="errors" />,
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.errorsTitle', {
      defaultMessage: 'Errors',
    }),
  },
  // transactions
  {
    exact: true,
    path: '/services/:serviceName/transactions',
    component: () => <ServiceDetails tab="transactions" />,
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.transactionsTitle', {
      defaultMessage: 'Transactions',
    }),
  },
  // metrics
  {
    exact: true,
    path: '/services/:serviceName/metrics',
    component: () => <ServiceDetails tab="metrics" />,
    breadcrumb: metricsBreadcrumb,
  },
  // service nodes, only enabled for java agents for now
  {
    exact: true,
    path: '/services/:serviceName/nodes',
    component: () => <ServiceDetails tab="nodes" />,
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.nodesTitle', {
      defaultMessage: 'JVMs',
    }),
  },
  // node metrics
  {
    exact: true,
    path: '/services/:serviceName/nodes/:serviceNodeName/metrics',
    component: () => <ServiceNodeMetrics />,
    breadcrumb: ({ location }) => {
      const { serviceNodeName } = resolveUrlParams(location, {});

      if (serviceNodeName === SERVICE_NODE_NAME_MISSING) {
        return UNIDENTIFIED_SERVICE_NODES_LABEL;
      }

      return serviceNodeName || '';
    },
  },
  {
    exact: true,
    path: '/services/:serviceName/transactions/view',
    component: TransactionDetails,
    breadcrumb: ({ location }) => {
      const query = toQuery(location.search);
      return query.transactionName as string;
    },
  },
  {
    exact: true,
    path: '/link-to/trace/:traceId',
    component: TraceLink,
    breadcrumb: null,
  },

  {
    exact: true,
    path: '/service-map',
    component: () => <Home tab="service-map" />,
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.serviceMapTitle', {
      defaultMessage: 'Service Map',
    }),
  },
  {
    exact: true,
    path: '/services/:serviceName/service-map',
    component: () => <ServiceDetails tab="service-map" />,
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.serviceMapTitle', {
      defaultMessage: 'Service Map',
    }),
  },
  {
    exact: true,
    path: '/settings/customize-ui',
    component: () => (
      <Settings>
        <CustomizeUI />
      </Settings>
    ),
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.settings.customizeUI', {
      defaultMessage: 'Customize UI',
    }),
  },
  {
    exact: true,
    path: '/settings/anomaly-detection',
    component: () => (
      <Settings>
        <AnomalyDetection />
      </Settings>
    ),
    breadcrumb: i18n.translate(
      'xpack.apm.breadcrumb.settings.anomalyDetection',
      {
        defaultMessage: 'Anomaly detection',
      }
    ),
  },
];
