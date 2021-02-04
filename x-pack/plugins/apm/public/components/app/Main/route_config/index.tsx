/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { Redirect, RouteComponentProps } from 'react-router-dom';
import { ApmServiceContextProvider } from '../../../../context/apm_service/apm_service_context';
import { UNIDENTIFIED_SERVICE_NODES_LABEL } from '../../../../../common/i18n';
import { SERVICE_NODE_NAME_MISSING } from '../../../../../common/service_nodes';
import { APMRouteDefinition } from '../../../../application/routes';
import { toQuery } from '../../../shared/Links/url_helpers';
import { ErrorGroupDetails } from '../../ErrorGroupDetails';
import { Home } from '../../Home';
import { ServiceDetails } from '../../service_details';
import { ServiceNodeMetrics } from '../../service_node_metrics';
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
import { enableServiceOverview } from '../../../../../common/ui_settings_keys';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';

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

function ServiceDetailsOverview(
  props: RouteComponentProps<{ serviceName: string }>
) {
  return <ServiceDetails {...props} tab="overview" />;
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

function SettingsAgentConfiguration(props: RouteComponentProps<{}>) {
  return (
    <Settings {...props}>
      <AgentConfigurations />
    </Settings>
  );
}

function SettingsAnomalyDetection(props: RouteComponentProps<{}>) {
  return (
    <Settings {...props}>
      <AnomalyDetection />
    </Settings>
  );
}

function SettingsApmIndices(props: RouteComponentProps<{}>) {
  return (
    <Settings {...props}>
      <ApmIndices />
    </Settings>
  );
}

function SettingsCustomizeUI(props: RouteComponentProps<{}>) {
  return (
    <Settings {...props}>
      <CustomizeUI />
    </Settings>
  );
}

function DefaultServicePageRouteHandler(
  props: RouteComponentProps<{ serviceName: string }>
) {
  const { uiSettings } = useApmPluginContext().core;
  const { serviceName } = props.match.params;
  if (uiSettings.get(enableServiceOverview)) {
    return renderAsRedirectTo(`/services/${serviceName}/overview`)(props);
  }
  return renderAsRedirectTo(`/services/${serviceName}/transactions`)(props);
}

/**
 * The array of route definitions to be used when the application
 * creates the routes.
 */
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
    component: HomeServices,
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.servicesTitle', {
      defaultMessage: 'Services',
    }),
  },
  {
    exact: true,
    path: '/traces',
    component: HomeTraces,
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
    component: SettingsApmIndices,
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.settings.indicesTitle', {
      defaultMessage: 'Indices',
    }),
  },
  {
    exact: true,
    path: '/settings/agent-configuration',
    component: SettingsAgentConfiguration,
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
    component: CreateAgentConfigurationRouteHandler,
  },
  {
    exact: true,
    path: '/settings/agent-configuration/edit',
    breadcrumb: i18n.translate(
      'xpack.apm.breadcrumb.settings.editAgentConfigurationTitle',
      { defaultMessage: 'Edit Agent Configuration' }
    ),
    component: EditAgentConfigurationRouteHandler,
  },
  {
    exact: true,
    path: '/services/:serviceName',
    breadcrumb: ({ match }) => match.params.serviceName,
    component: DefaultServicePageRouteHandler,
  } as APMRouteDefinition<{ serviceName: string }>,
  {
    exact: true,
    path: '/services/:serviceName/overview',
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.overviewTitle', {
      defaultMessage: 'Overview',
    }),
    component: withApmServiceContext(ServiceDetailsOverview),
  } as APMRouteDefinition<{ serviceName: string }>,
  // errors
  {
    exact: true,
    path: '/services/:serviceName/errors/:groupId',
    component: withApmServiceContext(ErrorGroupDetails),
    breadcrumb: ({ match }) => match.params.groupId,
  } as APMRouteDefinition<{ groupId: string; serviceName: string }>,
  {
    exact: true,
    path: '/services/:serviceName/errors',
    component: withApmServiceContext(ServiceDetailsErrors),
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.errorsTitle', {
      defaultMessage: 'Errors',
    }),
  },
  // transactions
  {
    exact: true,
    path: '/services/:serviceName/transactions',
    component: withApmServiceContext(ServiceDetailsTransactions),
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.transactionsTitle', {
      defaultMessage: 'Transactions',
    }),
  },
  // metrics
  {
    exact: true,
    path: '/services/:serviceName/metrics',
    component: withApmServiceContext(ServiceDetailsMetrics),
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.metricsTitle', {
      defaultMessage: 'Metrics',
    }),
  },
  // service nodes, only enabled for java agents for now
  {
    exact: true,
    path: '/services/:serviceName/nodes',
    component: withApmServiceContext(ServiceDetailsNodes),
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.nodesTitle', {
      defaultMessage: 'JVMs',
    }),
  },
  // node metrics
  {
    exact: true,
    path: '/services/:serviceName/nodes/:serviceNodeName/metrics',
    component: withApmServiceContext(ServiceNodeMetrics),
    breadcrumb: ({ match }) => {
      const { serviceNodeName } = match.params;

      if (serviceNodeName === SERVICE_NODE_NAME_MISSING) {
        return UNIDENTIFIED_SERVICE_NODES_LABEL;
      }

      return serviceNodeName || '';
    },
  },
  {
    exact: true,
    path: '/services/:serviceName/transactions/view',
    component: withApmServiceContext(TransactionDetails),
    breadcrumb: ({ location }) => {
      const query = toQuery(location.search);
      return query.transactionName as string;
    },
  },
  {
    exact: true,
    path: '/services/:serviceName/service-map',
    component: withApmServiceContext(ServiceDetailsServiceMap),
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.serviceMapTitle', {
      defaultMessage: 'Service Map',
    }),
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
    component: HomeServiceMap,
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.serviceMapTitle', {
      defaultMessage: 'Service Map',
    }),
  },
  {
    exact: true,
    path: '/settings/customize-ui',
    component: SettingsCustomizeUI,
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.settings.customizeUI', {
      defaultMessage: 'Customize UI',
    }),
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
  },
];

function withApmServiceContext(WrappedComponent: React.ComponentType<any>) {
  return (props: any) => {
    return (
      <ApmServiceContextProvider>
        <WrappedComponent {...props} />
      </ApmServiceContextProvider>
    );
  };
}
