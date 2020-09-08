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
import { BreadcrumbRoute } from '../ProvideBreadcrumbs';
import {
  CreateAgentConfigurationRouteHandler,
  EditAgentConfigurationRouteHandler,
} from './route_handlers/agent_configuration';
import { RouteName } from './route_names';

/**
 * Given a path, redirect to that location, preserving the search and maintaining
 * backward-compatibilty with legacy (pre-7.9) hash-based URLs.
 */
export function renderAsRedirectTo(to: string) {
  return ({ location }: RouteComponentProps<{}>) => {
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
}

// These component function definitions are used below with the `component`
// property of the route definitions.
//
// If you provide an inline function to the component prop, you would create a
// new component every render. This results in the existing component unmounting
// and the new component mounting instead of just updating the existing component.
//
// This means you should use `render` if you're providing an inline function.
// However, the `ApmRoute` component from @elastic/apm-rum-react, only supports
// `component`, and will give you a large console warning if you use `render`.
//
// This warning cannot be turned off
// (see https://github.com/elastic/apm-agent-rum-js/issues/881) so while this is
// slightly more code, it provides better performance without causing console
// warnings to appear.
function HomeServices() {
  return <Home tab="services" />;
}

function HomeServiceMap() {
  return <Home tab="service-map" />;
}

function HomeTraces() {
  return <Home tab="traces" />;
}

function ServiceDetailsErrors(
  props: RouteComponentProps<{ serviceName: string }>
) {
  return <ServiceDetails {...props} tab="errors" />;
}

function ServiceDetailsMetrics(
  props: RouteComponentProps<{ serviceName: string }>
) {
  return <ServiceDetails {...props} tab="metrics" />;
}

function ServiceDetailsNodes(
  props: RouteComponentProps<{ serviceName: string }>
) {
  return <ServiceDetails {...props} tab="nodes" />;
}

function ServiceDetailsServiceMap(
  props: RouteComponentProps<{ serviceName: string }>
) {
  return <ServiceDetails {...props} tab="service-map" />;
}

function ServiceDetailsTransactions(
  props: RouteComponentProps<{ serviceName: string }>
) {
  return <ServiceDetails {...props} tab="transactions" />;
}

function SettingsAgentConfiguration() {
  return (
    <Settings>
      <AgentConfigurations />
    </Settings>
  );
}

function SettingsAnomalyDetection() {
  return (
    <Settings>
      <AnomalyDetection />
    </Settings>
  );
}

function SettingsApmIndices() {
  return (
    <Settings>
      <ApmIndices />
    </Settings>
  );
}

function SettingsCustomizeUI() {
  return (
    <Settings>
      <CustomizeUI />
    </Settings>
  );
}

/**
 * The array of route definitions to be used when the application
 * creates the routes.
 */
export const routes: BreadcrumbRoute[] = [
  {
    exact: true,
    path: '/',
    component: renderAsRedirectTo('/services'),
    breadcrumb: 'APM',
    name: RouteName.HOME,
  },
  {
    exact: true,
    path: '/services',
    component: HomeServices,
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.servicesTitle', {
      defaultMessage: 'Services',
    }),
    name: RouteName.SERVICES,
  },
  {
    exact: true,
    path: '/traces',
    component: HomeTraces,
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.tracesTitle', {
      defaultMessage: 'Traces',
    }),
    name: RouteName.TRACES,
  },
  {
    exact: true,
    path: '/settings',
    component: renderAsRedirectTo('/settings/agent-configuration'),
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.listSettingsTitle', {
      defaultMessage: 'Settings',
    }),
    name: RouteName.SETTINGS,
  },
  {
    exact: true,
    path: '/settings/apm-indices',
    component: SettingsApmIndices,
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.settings.indicesTitle', {
      defaultMessage: 'Indices',
    }),
    name: RouteName.INDICES,
  },
  {
    exact: true,
    path: '/settings/agent-configuration',
    component: SettingsAgentConfiguration,
    breadcrumb: i18n.translate(
      'xpack.apm.breadcrumb.settings.agentConfigurationTitle',
      { defaultMessage: 'Agent Configuration' }
    ),
    name: RouteName.AGENT_CONFIGURATION,
  },
  {
    exact: true,
    path: '/settings/agent-configuration/create',
    breadcrumb: i18n.translate(
      'xpack.apm.breadcrumb.settings.createAgentConfigurationTitle',
      { defaultMessage: 'Create Agent Configuration' }
    ),
    name: RouteName.AGENT_CONFIGURATION_CREATE,
    component: CreateAgentConfigurationRouteHandler,
  },
  {
    exact: true,
    path: '/settings/agent-configuration/edit',
    breadcrumb: i18n.translate(
      'xpack.apm.breadcrumb.settings.editAgentConfigurationTitle',
      { defaultMessage: 'Edit Agent Configuration' }
    ),
    name: RouteName.AGENT_CONFIGURATION_EDIT,
    component: EditAgentConfigurationRouteHandler,
  },
  {
    exact: true,
    path: '/services/:serviceName',
    breadcrumb: ({ match }) => match.params.serviceName,
    component: (props: RouteComponentProps<{ serviceName: string }>) =>
      renderAsRedirectTo(
        `/services/${props.match.params.serviceName}/transactions`
      )(props),
    name: RouteName.SERVICE,
  },
  // errors
  {
    exact: true,
    path: '/services/:serviceName/errors/:groupId',
    component: ErrorGroupDetails,
    breadcrumb: ({ match }) => match.params.groupId,
    name: RouteName.ERROR,
  },
  {
    exact: true,
    path: '/services/:serviceName/errors',
    component: ServiceDetailsErrors,
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.errorsTitle', {
      defaultMessage: 'Errors',
    }),
    name: RouteName.ERRORS,
  },
  // transactions
  {
    exact: true,
    path: '/services/:serviceName/transactions',
    component: ServiceDetailsTransactions,
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.transactionsTitle', {
      defaultMessage: 'Transactions',
    }),
    name: RouteName.TRANSACTIONS,
  },
  // metrics
  {
    exact: true,
    path: '/services/:serviceName/metrics',
    component: ServiceDetailsMetrics,
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.metricsTitle', {
      defaultMessage: 'Metrics',
    }),
    name: RouteName.METRICS,
  },
  // service nodes, only enabled for java agents for now
  {
    exact: true,
    path: '/services/:serviceName/nodes',
    component: ServiceDetailsNodes,
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.nodesTitle', {
      defaultMessage: 'JVMs',
    }),
    name: RouteName.SERVICE_NODES,
  },
  // node metrics
  {
    exact: true,
    path: '/services/:serviceName/nodes/:serviceNodeName/metrics',
    component: ServiceNodeMetrics,
    breadcrumb: ({ match }) => {
      const { serviceNodeName } = match.params;

      if (serviceNodeName === SERVICE_NODE_NAME_MISSING) {
        return UNIDENTIFIED_SERVICE_NODES_LABEL;
      }

      return serviceNodeName || '';
    },
    name: RouteName.SERVICE_NODE_METRICS,
  },
  {
    exact: true,
    path: '/services/:serviceName/transactions/view',
    component: TransactionDetails,
    breadcrumb: ({ location }) => {
      const query = toQuery(location.search);
      return query.transactionName as string;
    },
    name: RouteName.TRANSACTION_NAME,
  },
  {
    exact: true,
    path: '/link-to/trace/:traceId',
    component: TraceLink,
    breadcrumb: null,
    name: RouteName.LINK_TO_TRACE,
  },
  {
    exact: true,
    path: '/service-map',
    component: HomeServiceMap,
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.serviceMapTitle', {
      defaultMessage: 'Service Map',
    }),
    name: RouteName.SERVICE_MAP,
  },
  {
    exact: true,
    path: '/services/:serviceName/service-map',
    component: ServiceDetailsServiceMap,
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.serviceMapTitle', {
      defaultMessage: 'Service Map',
    }),
    name: RouteName.SINGLE_SERVICE_MAP,
  },
  {
    exact: true,
    path: '/settings/customize-ui',
    component: SettingsCustomizeUI,
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.settings.customizeUI', {
      defaultMessage: 'Customize UI',
    }),
    name: RouteName.CUSTOMIZE_UI,
  },
  {
    exact: true,
    path: '/settings/anomaly-detection',
    component: SettingsAnomalyDetection,
    breadcrumb: i18n.translate(
      'xpack.apm.breadcrumb.settings.anomalyDetection',
      {
        defaultMessage: 'Anomaly detection',
      }
    ),
    name: RouteName.ANOMALY_DETECTION,
  },
];
