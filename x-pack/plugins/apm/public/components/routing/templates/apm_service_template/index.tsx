/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageHeaderProps,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { omit } from 'lodash';
import React from 'react';
import {
  isMobileAgentName,
  isJavaAgentName,
  isJRubyAgent,
  isRumAgentName,
  isServerlessAgent,
} from '../../../../../common/agent_name';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { ApmServiceContextProvider } from '../../../../context/apm_service/apm_service_context';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useBreadcrumb } from '../../../../context/breadcrumbs/use_breadcrumb';
import { ServiceAnomalyTimeseriesContextProvider } from '../../../../context/service_anomaly_timeseries/service_anomaly_timeseries_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { SearchBar } from '../../../shared/search_bar';
import { ServiceIcons } from '../../../shared/service_icons';
import { ApmMainTemplate } from '../apm_main_template';
import { AnalyzeDataButton } from './analyze_data_button';
import { getAlertingCapabilities } from '../../../alerting/get_alerting_capabilities';
import { BetaBadge } from '../../../shared/beta_badge';
import { TechnicalPreviewBadge } from '../../../shared/technical_preview_badge';

type Tab = NonNullable<EuiPageHeaderProps['tabs']>[0] & {
  key:
    | 'overview'
    | 'transactions'
    | 'dependencies'
    | 'errors'
    | 'metrics'
    | 'nodes'
    | 'infrastructure'
    | 'service-map'
    | 'logs'
    | 'profiling'
    | 'alerts';
  hidden?: boolean;
};

interface Props {
  title: string;
  children: React.ReactChild;
  selectedTab: Tab['key'];
  searchBarOptions?: React.ComponentProps<typeof SearchBar>;
}

export function ApmServiceTemplate(props: Props) {
  return (
    <ApmServiceContextProvider>
      <TemplateWithContext {...props} />
    </ApmServiceContextProvider>
  );
}

function TemplateWithContext({
  title,
  children,
  selectedTab,
  searchBarOptions,
}: Props) {
  const {
    path: { serviceName },
    query,
    query: { rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}/*');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const router = useApmRouter();

  const tabs = useTabs({ selectedTab });

  useBreadcrumb(
    () => ({
      title,
      href: router.link(`/services/{serviceName}/${selectedTab}` as const, {
        path: { serviceName },
        query,
      }),
    }),
    [query, router, selectedTab, serviceName, title]
  );

  return (
    <ApmMainTemplate
      pageHeader={{
        tabs,
        pageTitle: (
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem>
              <EuiFlexGroup alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiTitle size="l">
                    <h1 data-test-subj="apmMainTemplateHeaderServiceName">
                      {serviceName}
                    </h1>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <ServiceIcons
                    serviceName={serviceName}
                    start={start}
                    end={end}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <AnalyzeDataButton />
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      }}
    >
      <SearchBar {...searchBarOptions} />
      <ServiceAnomalyTimeseriesContextProvider>
        {children}
      </ServiceAnomalyTimeseriesContextProvider>
    </ApmMainTemplate>
  );
}

export function isMetricsTabHidden({
  agentName,
  runtimeName,
}: {
  agentName?: string;
  runtimeName?: string;
}) {
  return (
    !agentName ||
    isRumAgentName(agentName) ||
    isJavaAgentName(agentName) ||
    isMobileAgentName(agentName) ||
    isJRubyAgent(agentName, runtimeName) ||
    isServerlessAgent(runtimeName)
  );
}

export function isMetricsJVMsTabHidden({
  agentName,
  runtimeName,
}: {
  agentName?: string;
  runtimeName?: string;
}) {
  return (
    !(isJavaAgentName(agentName) || isJRubyAgent(agentName, runtimeName)) ||
    isServerlessAgent(runtimeName)
  );
}

export function isInfraTabHidden({
  agentName,
  runtimeName,
}: {
  agentName?: string;
  runtimeName?: string;
}) {
  return (
    !agentName ||
    isRumAgentName(agentName) ||
    isMobileAgentName(agentName) ||
    isServerlessAgent(runtimeName)
  );
}

function useTabs({ selectedTab }: { selectedTab: Tab['key'] }) {
  const { agentName, runtimeName } = useApmServiceContext();
  const { config, core, plugins } = useApmPluginContext();
  const { capabilities } = core.application;
  const { isAlertingAvailable, canReadAlerts } = getAlertingCapabilities(
    plugins,
    capabilities
  );

  const router = useApmRouter();

  const {
    path: { serviceName },
    query: queryFromUrl,
  } = useApmParams(`/services/{serviceName}/${selectedTab}` as const);

  const query = omit(
    queryFromUrl,
    'page',
    'pageSize',
    'sortField',
    'sortDirection'
  );

  const tabs: Tab[] = [
    {
      key: 'overview',
      href: router.link('/services/{serviceName}/overview', {
        path: { serviceName },
        query,
      }),
      label: i18n.translate('xpack.apm.serviceDetails.overviewTabLabel', {
        defaultMessage: 'Overview',
      }),
    },
    {
      key: 'transactions',
      href: router.link('/services/{serviceName}/transactions', {
        path: { serviceName },
        query,
      }),
      label: i18n.translate('xpack.apm.serviceDetails.transactionsTabLabel', {
        defaultMessage: 'Transactions',
      }),
    },
    {
      key: 'dependencies',
      href: router.link('/services/{serviceName}/dependencies', {
        path: { serviceName },
        query,
      }),
      label: i18n.translate('xpack.apm.serviceDetails.dependenciesTabLabel', {
        defaultMessage: 'Dependencies',
      }),
      hidden:
        !agentName || isRumAgentName(agentName) || isMobileAgentName(agentName),
    },
    {
      key: 'errors',
      href: router.link('/services/{serviceName}/errors', {
        path: { serviceName },
        query,
      }),
      label: i18n.translate('xpack.apm.serviceDetails.errorsTabLabel', {
        defaultMessage: 'Errors',
      }),
    },
    {
      key: 'metrics',
      href: router.link('/services/{serviceName}/metrics', {
        path: { serviceName },
        query,
      }),
      label: i18n.translate('xpack.apm.serviceDetails.metricsTabLabel', {
        defaultMessage: 'Metrics',
      }),
      hidden: isMetricsTabHidden({ agentName, runtimeName }),
    },
    {
      key: 'nodes',
      href: router.link('/services/{serviceName}/nodes', {
        path: { serviceName },
        query,
      }),
      label: i18n.translate('xpack.apm.serviceDetails.nodesTabLabel', {
        defaultMessage: 'Metrics',
      }),
      hidden: isMetricsJVMsTabHidden({ agentName, runtimeName }),
    },
    {
      key: 'infrastructure',
      href: router.link('/services/{serviceName}/infrastructure', {
        path: { serviceName },
        query,
      }),
      append: <BetaBadge icon="beaker" />,
      label: i18n.translate('xpack.apm.home.infraTabLabel', {
        defaultMessage: 'Infrastructure',
      }),
      hidden: isInfraTabHidden({ agentName, runtimeName }),
    },
    {
      key: 'service-map',
      href: router.link('/services/{serviceName}/service-map', {
        path: { serviceName },
        query,
      }),
      label: i18n.translate('xpack.apm.home.serviceMapTabLabel', {
        defaultMessage: 'Service Map',
      }),
    },
    {
      key: 'logs',
      href: router.link('/services/{serviceName}/logs', {
        path: { serviceName },
        query,
      }),
      label: i18n.translate('xpack.apm.home.serviceLogsTabLabel', {
        defaultMessage: 'Logs',
      }),
      hidden:
        !agentName || isRumAgentName(agentName) || isMobileAgentName(agentName),
    },
    {
      key: 'profiling',
      href: router.link('/services/{serviceName}/profiling', {
        path: {
          serviceName,
        },
        query,
      }),
      hidden: !config.profilingEnabled,
      append: <TechnicalPreviewBadge icon="beaker" />,
      label: i18n.translate('xpack.apm.serviceDetails.profilingTabLabel', {
        defaultMessage: 'Profiling',
      }),
    },
    {
      key: 'alerts',
      href: router.link('/services/{serviceName}/alerts', {
        path: { serviceName },
        query,
      }),
      append: <TechnicalPreviewBadge icon="beaker" />,
      label: i18n.translate('xpack.apm.home.alertsTabLabel', {
        defaultMessage: 'Alerts',
      }),
      hidden: !(isAlertingAvailable && canReadAlerts),
    },
  ];

  return tabs
    .filter((t) => !t.hidden)
    .map(({ href, key, label, append }) => ({
      href,
      label,
      append,
      isSelected: key === selectedTab,
    }));
}
