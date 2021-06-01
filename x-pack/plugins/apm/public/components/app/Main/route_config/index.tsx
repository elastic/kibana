/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isFunction } from 'lodash';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { ApmServiceContextProvider } from '../../../../context/apm_service/apm_service_context';
import { getServiceNodeName } from '../../../../../common/service_nodes';
import { APMRouteDefinition } from '../../../../application/routes';
import { toQuery } from '../../../shared/Links/url_helpers';
import { ErrorGroupDetails } from '../../ErrorGroupDetails';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { ServiceDetails } from '../../service_details';
import { ServiceNodeMetrics } from '../../service_node_metrics';
import { Settings } from '../../Settings';
import { AgentConfigurations } from '../../Settings/AgentConfigurations';
import { AnomalyDetection } from '../../Settings/anomaly_detection';
import { ApmIndices } from '../../Settings/ApmIndices';
import { CustomizeUI } from '../../Settings/CustomizeUI';
import { TraceLink } from '../../TraceLink';
import { TransactionDetails } from '../../transaction_details';
import {
  CreateAgentConfigurationRouteHandler,
  EditAgentConfigurationRouteHandler,
} from './route_handlers/agent_configuration';
import { enableServiceOverview } from '../../../../../common/ui_settings_keys';

import { renderAsRedirectTo } from '../../../routing/render_as_redirect';
import { ApmMainTemplate } from '../../../routing/templates/apm_main_template';
import { serviceInventoryRoutes } from '../../../routing/views/service_inventory';
import { traceOverviewRoute } from '../../../routing/views/trace_overview';
import { serviceMapRoute } from '../../../routing/views/service_map';

// These component function definitions are used below with the `component`
// property of the route definitions.
//
// If you provide an inline function to the component prop, you would create a
// new component every render. This results in the existing component unmounting
// and the new component mounting instead of just updating the existing component.

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

function ServiceDetailsProfiling(
  props: RouteComponentProps<{ serviceName: string }>
) {
  return <ServiceDetails {...props} tab="profiling" />;
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
const SettingsApmIndicesTitle = i18n.translate(
  'xpack.apm.breadcrumb.settings.indicesTitle',
  { defaultMessage: 'Indices' }
);

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

const SettingsAgentConfigurationTitle = i18n.translate(
  'xpack.apm.breadcrumb.settings.agentConfigurationTitle',
  { defaultMessage: 'Agent Configuration' }
);
const CreateAgentConfigurationTitle = i18n.translate(
  'xpack.apm.breadcrumb.settings.createAgentConfigurationTitle',
  { defaultMessage: 'Create Agent Configuration' }
);
const EditAgentConfigurationTitle = i18n.translate(
  'xpack.apm.breadcrumb.settings.editAgentConfigurationTitle',
  { defaultMessage: 'Edit Agent Configuration' }
);
const SettingsCustomizeUITitle = i18n.translate(
  'xpack.apm.breadcrumb.settings.customizeUI',
  {
    defaultMessage: 'Customize UI',
  }
);
const SettingsAnomalyDetectionTitle = i18n.translate(
  'xpack.apm.breadcrumb.settings.anomalyDetection',
  {
    defaultMessage: 'Anomaly detection',
  }
);
/**
 * The array of route definitions to be used when the application
 * creates the routes.
 */
export const routes: APMRouteDefinition[] = [
  /*
   * Home routes
   */
  ...serviceInventoryRoutes,
  traceOverviewRoute,
  serviceMapRoute,

  /*
   * Settings routes
   */
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
    path: '/settings/agent-configuration',
    component: withApmMainTemplate(SettingsAgentConfiguration, {
      pageTitle: SettingsAgentConfigurationTitle,
    }),
    breadcrumb: SettingsAgentConfigurationTitle,
  },
  {
    exact: true,
    path: '/settings/agent-configuration/create',
    component: withApmMainTemplate(CreateAgentConfigurationRouteHandler, {
      pageTitle: CreateAgentConfigurationTitle,
    }),
    breadcrumb: CreateAgentConfigurationTitle,
  },
  {
    exact: true,
    path: '/settings/agent-configuration/edit',
    breadcrumb: EditAgentConfigurationTitle,
    component: withApmMainTemplate(EditAgentConfigurationRouteHandler, {
      pageTitle: EditAgentConfigurationTitle,
    }),
  },
  {
    exact: true,
    path: '/settings/apm-indices',
    component: withApmMainTemplate(SettingsApmIndices, {
      pageTitle: SettingsApmIndicesTitle,
    }),
    breadcrumb: SettingsApmIndicesTitle,
  },
  {
    exact: true,
    path: '/settings/customize-ui',
    component: withApmMainTemplate(SettingsCustomizeUI, {
      pageTitle: SettingsCustomizeUITitle,
    }),
    breadcrumb: SettingsCustomizeUITitle,
  },
  {
    exact: true,
    path: '/settings/anomaly-detection',
    component: withApmMainTemplate(SettingsAnomalyDetection, {
      pageTitle: SettingsAnomalyDetectionTitle,
    }),
    breadcrumb: SettingsAnomalyDetectionTitle,
  },

  /*
   * Services routes (with APM Service context)
   */
  {
    exact: true,
    path: '/services/:serviceName',
    breadcrumb: ({ match }) => match.params.serviceName,
    component: DefaultServicePageRouteHandler,
  },
  {
    exact: true,
    path: '/services/:serviceName/overview',
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.overviewTitle', {
      defaultMessage: 'Overview',
    }),
    component: withApmServiceContext(ServiceDetailsOverview, {
      pageTitle: ({ match }) => match.params.serviceName,
    }),
  },
  // errors
  {
    exact: true,
    path: '/services/:serviceName/errors/:groupId',
    component: withApmServiceContext(ErrorGroupDetails, {
      pageTitle: ({ match }) => match.params.serviceName,
    }),
    breadcrumb: ({ match }) => match.params.groupId,
  },
  {
    exact: true,
    path: '/services/:serviceName/errors',
    component: withApmServiceContext(ServiceDetailsErrors, {
      pageTitle: ({ match }) => match.params.serviceName,
    }),
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.errorsTitle', {
      defaultMessage: 'Errors',
    }),
  },
  {
    exact: true,
    path: '/services/:serviceName/transactions',
    component: withApmServiceContext(ServiceDetailsTransactions, {
      pageTitle: ({ match }) => match.params.serviceName,
    }),
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.transactionsTitle', {
      defaultMessage: 'Transactions',
    }),
  },
  {
    exact: true,
    path: '/services/:serviceName/metrics',
    component: withApmServiceContext(ServiceDetailsMetrics, {
      pageTitle: ({ match }) => match.params.serviceName,
    }),
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.metricsTitle', {
      defaultMessage: 'Metrics',
    }),
  },
  // service nodes, only enabled for java agents for now
  {
    exact: true,
    path: '/services/:serviceName/nodes',
    component: withApmServiceContext(ServiceDetailsNodes, {
      pageTitle: ({ match }) => match.params.serviceName,
    }),
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.nodesTitle', {
      defaultMessage: 'JVMs',
    }),
  },
  // node metrics
  {
    exact: true,
    path: '/services/:serviceName/nodes/:serviceNodeName/metrics',
    component: withApmServiceContext(ServiceNodeMetrics, {
      pageTitle: ({ match }) => match.params.serviceName,
    }),
    breadcrumb: ({ match }) => getServiceNodeName(match.params.serviceNodeName),
  },
  {
    exact: true,
    path: '/services/:serviceName/transactions/view',
    component: withApmServiceContext(TransactionDetails, {
      pageTitle: ({ match }) => match.params.serviceName,
    }),
    breadcrumb: ({ location }) => {
      const query = toQuery(location.search);
      return query.transactionName as string;
    },
  },
  {
    exact: true,
    path: '/services/:serviceName/profiling',
    component: withApmServiceContext(ServiceDetailsProfiling, {
      pageTitle: ({ match }) => match.params.serviceName,
    }),
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.serviceProfilingTitle', {
      defaultMessage: 'Profiling',
    }),
  },
  {
    exact: true,
    path: '/services/:serviceName/service-map',
    component: withApmServiceContext(ServiceDetailsServiceMap, {
      pageTitle: ({ match }) => match.params.serviceName,
    }),
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.serviceMapTitle', {
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
];

interface Options {
  pageTitle: string | ((props: any) => any);
  environmentSelector?: boolean;
}

{
  /* <ServiceIcons serviceName={serviceName} /> */
}

function withApmServiceContext(
  WrappedComponent: React.ComponentType<any>,
  options: Options
) {
  return (props: any) => {
    const pageTitle = isFunction(options.pageTitle)
      ? options.pageTitle(props)
      : options.pageTitle;

    return (
      <ApmMainTemplate
        pageTitle={pageTitle}
        environmentSelector={options.environmentSelector}
      >
        <ApmServiceContextProvider>
          <WrappedComponent {...props} />
        </ApmServiceContextProvider>
      </ApmMainTemplate>
    );
  };
}

function withApmMainTemplate<T>(
  WrappedComponent: React.ComponentType<any>,
  options: Options
) {
  return (props: T) => {
    const pageTitle = isFunction(options.pageTitle)
      ? options.pageTitle(props)
      : options.pageTitle;

    return (
      <ApmMainTemplate
        pageTitle={pageTitle}
        environmentSelector={options.environmentSelector}
      >
        <WrappedComponent {...props} />
      </ApmMainTemplate>
    );
  };
}
