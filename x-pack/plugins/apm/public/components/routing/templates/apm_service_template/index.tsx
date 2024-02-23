/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingLogo,
  EuiPageHeaderProps,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { enableAwsLambdaMetrics } from '@kbn/observability-plugin/common';
import { omit } from 'lodash';
import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useProfilingIntegrationSetting } from '../../../../hooks/use_profiling_integration_setting';
import {
  isAWSLambdaAgentName,
  isAzureFunctionsAgentName,
  isMobileAgentName,
  isRumAgentName,
  isRumOrMobileAgentName,
  isServerlessAgentName,
} from '../../../../../common/agent_name';
import { ApmFeatureFlagName } from '../../../../../common/apm_feature_flags';
import { ServerlessType } from '../../../../../common/serverless';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { ApmServiceContextProvider } from '../../../../context/apm_service/apm_service_context';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useBreadcrumb } from '../../../../context/breadcrumbs/use_breadcrumb';
import { ServiceAnomalyTimeseriesContextProvider } from '../../../../context/service_anomaly_timeseries/service_anomaly_timeseries_context';
import { useApmFeatureFlag } from '../../../../hooks/use_apm_feature_flag';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { isPending, useFetcher } from '../../../../hooks/use_fetcher';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { getAlertingCapabilities } from '../../../alerting/utils/get_alerting_capabilities';
import { BetaBadge } from '../../../shared/beta_badge';
import { replace } from '../../../shared/links/url_helpers';
import { SearchBar } from '../../../shared/search_bar/search_bar';
import { ServiceIcons } from '../../../shared/service_icons';
import { TechnicalPreviewBadge } from '../../../shared/technical_preview_badge';
import { ApmMainTemplate } from '../apm_main_template';
import { AnalyzeDataButton } from './analyze_data_button';

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
    | 'alerts'
    | 'profiling'
    | 'dashboards';
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
    query: { rangeFrom, rangeTo, environment },
  } = useApmParams('/services/{serviceName}/*');
  const history = useHistory();
  const location = useLocation();

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const router = useApmRouter();

  const tabs = useTabs({ selectedTab });

  const { agentName, serviceAgentStatus } = useApmServiceContext();

  const isPendingServiceAgent = !agentName && isPending(serviceAgentStatus);

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

  if (isMobileAgentName(agentName)) {
    replace(history, {
      pathname: location.pathname.replace('/services/', '/mobile-services/'),
    });
  }

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
                    environment={environment}
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
      {isPendingServiceAgent ? (
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiSpacer size="l" />
            <EuiLoadingLogo logo="logoObservability" size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <>
          <SearchBar {...searchBarOptions} />
          <ServiceAnomalyTimeseriesContextProvider>
            {children}
          </ServiceAnomalyTimeseriesContextProvider>
        </>
      )}
    </ApmMainTemplate>
  );
}

export function isMetricsTabHidden({
  agentName,
  serverlessType,
  isAwsLambdaEnabled,
}: {
  agentName?: string;
  serverlessType?: ServerlessType;
  isAwsLambdaEnabled?: boolean;
}) {
  if (isAWSLambdaAgentName(serverlessType)) {
    return !isAwsLambdaEnabled;
  }
  return (
    !agentName ||
    isRumAgentName(agentName) ||
    isAzureFunctionsAgentName(serverlessType)
  );
}

export function isInfraTabHidden({
  agentName,
  serverlessType,
  isInfraTabAvailable,
}: {
  agentName?: string;
  serverlessType?: ServerlessType;
  isInfraTabAvailable: boolean;
}) {
  return (
    !agentName ||
    isRumAgentName(agentName) ||
    isServerlessAgentName(serverlessType) ||
    !isInfraTabAvailable
  );
}

function useTabs({ selectedTab }: { selectedTab: Tab['key'] }) {
  const { agentName, serverlessType } = useApmServiceContext();
  const { core, plugins } = useApmPluginContext();
  const { capabilities } = core.application;
  const { isAlertingAvailable, canReadAlerts } = getAlertingCapabilities(
    plugins,
    capabilities
  );

  const router = useApmRouter();
  const isInfraTabAvailable = useApmFeatureFlag(
    ApmFeatureFlagName.InfrastructureTabAvailable
  );

  const isProfilingIntegrationEnabled = useProfilingIntegrationSetting();

  const isAwsLambdaEnabled = core.uiSettings.get<boolean>(
    enableAwsLambdaMetrics,
    true
  );

  const {
    path: { serviceName },
    query: queryFromUrl,
  } = useApmParams(`/services/{serviceName}/${selectedTab}` as const);

  const { rangeFrom, rangeTo, environment } = queryFromUrl;
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { data: serviceAlertsCount = { alertsCount: 0 } } = useFetcher(
    (callApmApi) => {
      return callApmApi(
        'GET /internal/apm/services/{serviceName}/alerts_count',
        {
          params: {
            path: {
              serviceName,
            },
            query: {
              start,
              end,
              environment,
            },
          },
        }
      );
    },
    [serviceName, start, end, environment]
  );

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
      hidden: !agentName || isRumAgentName(agentName),
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
      append: isServerlessAgentName(serverlessType) && (
        <TechnicalPreviewBadge icon="beaker" />
      ),
      hidden: isMetricsTabHidden({
        agentName,
        serverlessType,
        isAwsLambdaEnabled,
      }),
    },
    {
      key: 'infrastructure',
      href: router.link('/services/{serviceName}/infrastructure', {
        path: { serviceName },
        query,
      }),
      append: <BetaBadge icon="beta" />,
      label: i18n.translate('xpack.apm.home.infraTabLabel', {
        defaultMessage: 'Infrastructure',
      }),
      hidden: isInfraTabHidden({
        agentName,
        serverlessType,
        isInfraTabAvailable,
      }),
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
      append: isServerlessAgentName(serverlessType) && (
        <TechnicalPreviewBadge icon="beaker" />
      ),
      hidden:
        !agentName ||
        isRumAgentName(agentName) ||
        isAzureFunctionsAgentName(serverlessType),
    },
    {
      key: 'alerts',
      href: router.link('/services/{serviceName}/alerts', {
        path: { serviceName },
        query,
      }),
      append:
        serviceAlertsCount.alertsCount > 0 ? (
          <EuiToolTip
            position="bottom"
            content={i18n.translate(
              'xpack.apm.home.serviceAlertsTable.tooltip.activeAlertsExplanation',
              {
                defaultMessage: 'Active alerts',
              }
            )}
          >
            <EuiBadge color="danger">{serviceAlertsCount.alertsCount}</EuiBadge>
          </EuiToolTip>
        ) : null,
      label: i18n.translate('xpack.apm.home.alertsTabLabel', {
        defaultMessage: 'Alerts',
      }),
      hidden: !(isAlertingAvailable && canReadAlerts),
    },
    {
      key: 'profiling',
      href: router.link('/services/{serviceName}/profiling', {
        path: { serviceName },
        query,
      }),
      label: i18n.translate('xpack.apm.home.profilingTabLabel', {
        defaultMessage: 'Universal Profiling',
      }),
      hidden:
        !isProfilingIntegrationEnabled ||
        isRumOrMobileAgentName(agentName) ||
        isAWSLambdaAgentName(serverlessType),
    },
    {
      key: 'dashboards',
      href: router.link('/services/{serviceName}/dashboards', {
        path: { serviceName },
        query,
      }),
      label: i18n.translate('xpack.apm.home.dashboardsTabLabel', {
        defaultMessage: 'Dashboards',
      }),
      append: <TechnicalPreviewBadge icon="beaker" />,
    },
  ];

  return tabs
    .filter((t) => !t.hidden)
    .map(({ href, key, label, prepend, append }) => ({
      href,
      label,
      prepend,
      append,
      isSelected: key === selectedTab,
      'data-test-subj': `${key}Tab`,
    }));
}
