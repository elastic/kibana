/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { getServiceNodeName } from '../../../common/service_nodes';
import { APMRouteDefinition } from '../../application/routes';
import { toQuery } from '../shared/Links/url_helpers';
import { ErrorGroupDetails } from '../app/ErrorGroupDetails';
import { useApmPluginContext } from '../../context/apm_plugin/use_apm_plugin_context';
import { ServiceNodeMetrics } from '../app/service_node_metrics';
import { SettingsTemplate } from './templates/settings_template';
import { AgentConfigurations } from '../app/Settings/AgentConfigurations';
import { AnomalyDetection } from '../app/Settings/anomaly_detection';
import { ApmIndices } from '../app/Settings/ApmIndices';
import { CustomizeUI } from '../app/Settings/CustomizeUI';
import { TraceLink } from '../app/TraceLink';
import { TransactionLink } from '../app/transaction_link';
import { TransactionDetails } from '../app/transaction_details';
import { enableServiceOverview } from '../../../common/ui_settings_keys';
import { redirectTo } from './redirect_to';
import { ApmMainTemplate } from './templates/apm_main_template';
import { ApmServiceTemplate } from './templates/apm_service_template';
import { ServiceProfiling } from '../app/service_profiling';
import { ErrorGroupOverview } from '../app/error_group_overview';
import { ServiceMap } from '../app/service_map';
import { ServiceNodeOverview } from '../app/service_node_overview';
import { ServiceMetrics } from '../app/service_metrics';
import { ServiceOverview } from '../app/service_overview';
import { TransactionOverview } from '../app/transaction_overview';
import { ServiceInventory } from '../app/service_inventory';
import { TraceOverview } from '../app/trace_overview';
import { useFetcher } from '../../hooks/use_fetcher';
import { AgentConfigurationCreateEdit } from '../app/Settings/AgentConfigurations/AgentConfigurationCreateEdit';

// These component function definitions are used below with the `component`
// property of the route definitions.
//
// If you provide an inline function to the component prop, you would create a
// new component every render. This results in the existing component unmounting
// and the new component mounting instead of just updating the existing component.

const ServiceInventoryTitle = i18n.translate(
  'xpack.apm.views.serviceInventory.title',
  { defaultMessage: 'Services' }
);

function ServiceInventoryView() {
  return (
    <ApmMainTemplate pageTitle={ServiceInventoryTitle}>
      <ServiceInventory />
    </ApmMainTemplate>
  );
}

const TraceOverviewTitle = i18n.translate(
  'xpack.apm.views.traceOverview.title',
  {
    defaultMessage: 'Traces',
  }
);

function TraceOverviewView() {
  return (
    <ApmMainTemplate pageTitle={TraceOverviewTitle}>
      <TraceOverview />
    </ApmMainTemplate>
  );
}

const ServiceMapTitle = i18n.translate('xpack.apm.views.serviceMap.title', {
  defaultMessage: 'Service Map',
});

function ServiceMapView() {
  return (
    <ApmMainTemplate pageTitle={ServiceMapTitle}>
      <ServiceMap />
    </ApmMainTemplate>
  );
}

function ServiceDetailsErrorsRouteView(
  props: RouteComponentProps<{ serviceName: string }>
) {
  const { serviceName } = props.match.params;
  return (
    <ApmServiceTemplate serviceName={serviceName} selectedTab="errors">
      <ErrorGroupOverview serviceName={serviceName} />
    </ApmServiceTemplate>
  );
}

function ErrorGroupDetailsRouteView(
  props: RouteComponentProps<{ serviceName: string; groupId: string }>
) {
  const { serviceName, groupId } = props.match.params;
  return (
    <ApmServiceTemplate serviceName={serviceName} selectedTab="errors">
      <ErrorGroupDetails serviceName={serviceName} groupId={groupId} />
    </ApmServiceTemplate>
  );
}

function ServiceDetailsMetricsRouteView(
  props: RouteComponentProps<{ serviceName: string }>
) {
  const { serviceName } = props.match.params;
  return (
    <ApmServiceTemplate serviceName={serviceName} selectedTab="metrics">
      <ServiceMetrics />
    </ApmServiceTemplate>
  );
}

function ServiceDetailsNodesRouteView(
  props: RouteComponentProps<{ serviceName: string }>
) {
  const { serviceName } = props.match.params;
  return (
    <ApmServiceTemplate serviceName={serviceName} selectedTab="nodes">
      <ServiceNodeOverview serviceName={serviceName} />
    </ApmServiceTemplate>
  );
}

function ServiceDetailsOverviewRouteView(
  props: RouteComponentProps<{ serviceName: string }>
) {
  const { serviceName } = props.match.params;
  return (
    <ApmServiceTemplate
      serviceName={serviceName}
      selectedTab="overview"
      searchBarOptions={{
        showTransactionTypeSelector: true,
        showTimeComparison: true,
      }}
    >
      <ServiceOverview serviceName={serviceName} />
    </ApmServiceTemplate>
  );
}

function ServiceDetailsServiceMapRouteView(
  props: RouteComponentProps<{ serviceName: string }>
) {
  const { serviceName } = props.match.params;
  return (
    <ApmServiceTemplate
      serviceName={serviceName}
      selectedTab="service-map"
      searchBarOptions={{ hidden: true }}
    >
      <ServiceMap serviceName={serviceName} />
    </ApmServiceTemplate>
  );
}

function ServiceDetailsTransactionsRouteView(
  props: RouteComponentProps<{ serviceName: string }>
) {
  const { serviceName } = props.match.params;
  return (
    <ApmServiceTemplate
      serviceName={serviceName}
      selectedTab="transactions"
      searchBarOptions={{
        showTransactionTypeSelector: true,
      }}
    >
      <TransactionOverview serviceName={serviceName} />
    </ApmServiceTemplate>
  );
}

function ServiceDetailsProfilingRouteView(
  props: RouteComponentProps<{ serviceName: string }>
) {
  const { serviceName } = props.match.params;
  return (
    <ApmServiceTemplate serviceName={serviceName} selectedTab="profiling">
      <ServiceProfiling serviceName={serviceName} />
    </ApmServiceTemplate>
  );
}

function ServiceNodeMetricsRouteView(
  props: RouteComponentProps<{
    serviceName: string;
    serviceNodeName: string;
  }>
) {
  const { serviceName, serviceNodeName } = props.match.params;
  return (
    <ApmServiceTemplate serviceName={serviceName} selectedTab="nodes">
      <ServiceNodeMetrics
        serviceName={serviceName}
        serviceNodeName={serviceNodeName}
      />
    </ApmServiceTemplate>
  );
}

function TransactionDetailsRouteView(
  props: RouteComponentProps<{ serviceName: string }>
) {
  const { serviceName } = props.match.params;
  return (
    <ApmServiceTemplate serviceName={serviceName} selectedTab="transactions">
      <TransactionDetails />
    </ApmServiceTemplate>
  );
}

function SettingsAgentConfigurationRouteView() {
  return (
    <SettingsTemplate selectedTab="agent-configurations">
      <AgentConfigurations />
    </SettingsTemplate>
  );
}

function SettingsAnomalyDetectionRouteView() {
  return (
    <SettingsTemplate selectedTab="anomaly-detection">
      <AnomalyDetection />
    </SettingsTemplate>
  );
}

function SettingsApmIndicesRouteView() {
  return (
    <SettingsTemplate selectedTab="apm-indices">
      <ApmIndices />
    </SettingsTemplate>
  );
}

function SettingsCustomizeUI() {
  return (
    <SettingsTemplate selectedTab="customize-ui">
      <CustomizeUI />
    </SettingsTemplate>
  );
}

export function EditAgentConfigurationRouteView(props: RouteComponentProps) {
  const { search } = props.history.location;

  // typescript complains because `pageStop` does not exist in `APMQueryParams`
  // Going forward we should move away from globally declared query params and this is a first step
  // @ts-expect-error
  const { name, environment, pageStep } = toQuery(search);

  const res = useFetcher(
    (callApmApi) => {
      return callApmApi({
        endpoint: 'GET /api/apm/settings/agent-configuration/view',
        params: { query: { name, environment } },
      });
    },
    [name, environment]
  );

  return (
    <SettingsTemplate selectedTab="agent-configurations" {...props}>
      <AgentConfigurationCreateEdit
        pageStep={pageStep || 'choose-settings-step'}
        existingConfigResult={res}
      />
    </SettingsTemplate>
  );
}

export function CreateAgentConfigurationRouteView(props: RouteComponentProps) {
  const { search } = props.history.location;

  // Ignoring here because we specifically DO NOT want to add the query params to the global route handler
  // @ts-expect-error
  const { pageStep } = toQuery(search);

  return (
    <SettingsTemplate selectedTab="agent-configurations" {...props}>
      <AgentConfigurationCreateEdit
        pageStep={pageStep || 'choose-service-step'}
      />
    </SettingsTemplate>
  );
}

const SettingsApmIndicesTitle = i18n.translate(
  'xpack.apm.views.settings.indices.title',
  { defaultMessage: 'Indices' }
);

const SettingsAgentConfigurationTitle = i18n.translate(
  'xpack.apm.views.settings.agentConfiguration.title',
  { defaultMessage: 'Agent Configuration' }
);
const CreateAgentConfigurationTitle = i18n.translate(
  'xpack.apm.views.settings.createAgentConfiguration.title',
  { defaultMessage: 'Create Agent Configuration' }
);
const EditAgentConfigurationTitle = i18n.translate(
  'xpack.apm.views.settings.editAgentConfiguration.title',
  { defaultMessage: 'Edit Agent Configuration' }
);
const SettingsCustomizeUITitle = i18n.translate(
  'xpack.apm.views.settings.customizeUI.title',
  { defaultMessage: 'Customize app' }
);
const SettingsAnomalyDetectionTitle = i18n.translate(
  'xpack.apm.views.settings.anomalyDetection.title',
  { defaultMessage: 'Anomaly detection' }
);
const SettingsTitle = i18n.translate('xpack.apm.views.listSettings.title', {
  defaultMessage: 'Settings',
});

/**
 * The array of route definitions to be used when the application
 * creates the routes.
 */
export const apmRouteConfig: APMRouteDefinition[] = [
  /*
   * Home routes
   */
  {
    exact: true,
    path: '/',
    render: redirectTo('/services'),
    breadcrumb: 'APM',
  },
  {
    exact: true,
    path: '/services', // !! Need to be kept in sync with the deepLinks in x-pack/plugins/apm/public/plugin.ts
    component: ServiceInventoryView,
    breadcrumb: ServiceInventoryTitle,
  },
  {
    exact: true,
    path: '/traces', // !! Need to be kept in sync with the deepLinks in x-pack/plugins/apm/public/plugin.ts
    component: TraceOverviewView,
    breadcrumb: TraceOverviewTitle,
  },
  {
    exact: true,
    path: '/service-map', // !! Need to be kept in sync with the deepLinks in x-pack/plugins/apm/public/plugin.ts
    component: ServiceMapView,
    breadcrumb: ServiceMapTitle,
  },

  /*
   * Settings routes
   */
  {
    exact: true,
    path: '/settings',
    render: redirectTo('/settings/agent-configuration'),
    breadcrumb: SettingsTitle,
  },
  {
    exact: true,
    path: '/settings/agent-configuration',
    component: SettingsAgentConfigurationRouteView,
    breadcrumb: SettingsAgentConfigurationTitle,
  },
  {
    exact: true,
    path: '/settings/agent-configuration/create',
    component: CreateAgentConfigurationRouteView,
    breadcrumb: CreateAgentConfigurationTitle,
  },
  {
    exact: true,
    path: '/settings/agent-configuration/edit',
    breadcrumb: EditAgentConfigurationTitle,
    component: EditAgentConfigurationRouteView,
  },
  {
    exact: true,
    path: '/settings/apm-indices',
    component: SettingsApmIndicesRouteView,
    breadcrumb: SettingsApmIndicesTitle,
  },
  {
    exact: true,
    path: '/settings/customize-ui',
    component: SettingsCustomizeUI,
    breadcrumb: SettingsCustomizeUITitle,
  },
  {
    exact: true,
    path: '/settings/anomaly-detection',
    component: SettingsAnomalyDetectionRouteView,
    breadcrumb: SettingsAnomalyDetectionTitle,
  },

  /*
   * Services routes (with APM Service context)
   */
  {
    exact: true,
    path: '/services/:serviceName',
    breadcrumb: ({ match }) => match.params.serviceName,
    component: RedirectToDefaultServiceRouteView,
  },
  {
    exact: true,
    path: '/services/:serviceName/overview',
    breadcrumb: i18n.translate('xpack.apm.views.overview.title', {
      defaultMessage: 'Overview',
    }),
    component: ServiceDetailsOverviewRouteView,
  },
  {
    exact: true,
    path: '/services/:serviceName/transactions',
    component: ServiceDetailsTransactionsRouteView,
    breadcrumb: i18n.translate('xpack.apm.views.transactions.title', {
      defaultMessage: 'Transactions',
    }),
  },
  {
    exact: true,
    path: '/services/:serviceName/errors/:groupId',
    component: ErrorGroupDetailsRouteView,
    breadcrumb: ({ match }) => match.params.groupId,
  },
  {
    exact: true,
    path: '/services/:serviceName/errors',
    component: ServiceDetailsErrorsRouteView,
    breadcrumb: i18n.translate('xpack.apm.views.errors.title', {
      defaultMessage: 'Errors',
    }),
  },
  {
    exact: true,
    path: '/services/:serviceName/metrics',
    component: ServiceDetailsMetricsRouteView,
    breadcrumb: i18n.translate('xpack.apm.views.metrics.title', {
      defaultMessage: 'Metrics',
    }),
  },
  // service nodes, only enabled for java agents for now
  {
    exact: true,
    path: '/services/:serviceName/nodes',
    component: ServiceDetailsNodesRouteView,
    breadcrumb: i18n.translate('xpack.apm.views.nodes.title', {
      defaultMessage: 'JVMs',
    }),
  },
  // node metrics
  {
    exact: true,
    path: '/services/:serviceName/nodes/:serviceNodeName/metrics',
    component: ServiceNodeMetricsRouteView,
    breadcrumb: ({ match }) => getServiceNodeName(match.params.serviceNodeName),
  },
  {
    exact: true,
    path: '/services/:serviceName/transactions/view',
    component: TransactionDetailsRouteView,
    breadcrumb: ({ location }) => {
      const query = toQuery(location.search);
      return query.transactionName as string;
    },
  },
  {
    exact: true,
    path: '/services/:serviceName/profiling',
    component: ServiceDetailsProfilingRouteView,
    breadcrumb: i18n.translate('xpack.apm.views.serviceProfiling.title', {
      defaultMessage: 'Profiling',
    }),
  },
  {
    exact: true,
    path: '/services/:serviceName/service-map',
    component: ServiceDetailsServiceMapRouteView,
    breadcrumb: i18n.translate('xpack.apm.views.serviceMap.title', {
      defaultMessage: 'Service Map',
    }),
  },
  /*
   * Utilility routes
   */
  {
    exact: true,
    path: '/link-to/trace/:traceId',
    component: TraceLink,
    breadcrumb: null,
  },
  {
    exact: true,
    path: '/link-to/transaction/:transactionId',
    component: TransactionLink,
    breadcrumb: null,
  },
];

function RedirectToDefaultServiceRouteView(
  props: RouteComponentProps<{ serviceName: string }>
) {
  const { uiSettings } = useApmPluginContext().core;
  const { serviceName } = props.match.params;
  if (uiSettings.get(enableServiceOverview)) {
    return redirectTo(`/services/${serviceName}/overview`)(props);
  }
  return redirectTo(`/services/${serviceName}/transactions`)(props);
}
