/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingLogo,
  EuiPageHeaderProps,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { useLocation } from 'react-router-dom';
import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { enableAwsLambdaMetrics } from '@kbn/observability-plugin/common';
import { omit } from 'lodash';
import React from 'react';
import { useHistory } from 'react-router-dom';
import {
  isMobileAgentName,
  isRumAgentName,
  isAWSLambdaAgent,
  isAzureFunctionsAgent,
  isServerlessAgent,
} from '../../../../../common/agent_name';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { ApmServiceContextProvider } from '../../../../context/apm_service/apm_service_context';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useBreadcrumb } from '../../../../context/breadcrumbs/use_breadcrumb';
import { ServiceAnomalyTimeseriesContextProvider } from '../../../../context/service_anomaly_timeseries/service_anomaly_timeseries_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { isPending, useFetcher } from '../../../../hooks/use_fetcher';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { getAlertingCapabilities } from '../../../alerting/utils/get_alerting_capabilities';
import { BetaBadge } from '../../../shared/beta_badge';
import { replace } from '../../../shared/links/url_helpers';
import { SearchBar } from '../../../shared/search_bar';
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
  cloudProviderAndService,
  isAwsLambdaEnabled,
}: {
  agentName?: string;
  cloudProviderAndService?: string;
  isAwsLambdaEnabled?: boolean;
}) {
  if (isAWSLambdaAgent(cloudProviderAndService)) {
    return !isAwsLambdaEnabled;
  }
  return !agentName || isRumAgentName(agentName) || isServerlessAgent(cloudProviderAndService);
}

export function isInfraTabHidden({
  agentName,
  cloudProviderAndService,
}: {
  agentName?: string;
  cloudProviderAndService?: string;
}) {
  return (
    !agentName || isRumAgentName(agentName) || isServerlessAgent(cloudProviderAndService)
  );
}

function useTabs({ selectedTab }: { selectedTab: Tab['key'] }) {
  const { agentName, cloudProviderAndService } = useApmServiceContext();
  const { core, plugins } = useApmPluginContext();
  const { capabilities } = core.application;
  const { isAlertingAvailable, canReadAlerts } = getAlertingCapabilities(
    plugins,
    capabilities
  );

  const router = useApmRouter();

  const isAwsLambdaEnabled = core.uiSettings.get<boolean>(
    enableAwsLambdaMetrics,
    true
  );

  const {
    path: { serviceName },
    query: queryFromUrl,
  } = useApmParams(`/services/{serviceName}/${selectedTab}` as const);

  const { data: serviceAlertsCount = { alertsCount: 0 } } = useFetcher(
    (callApmApi) => {
      return callApmApi(
        'GET /internal/apm/services/{serviceName}/alerts_count',
        {
          params: {
            path: {
              serviceName,
            },
          },
        }
      );
    },
    [serviceName]
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
      append: isServerlessAgent(cloudProviderAndService) && (
        <TechnicalPreviewBadge icon="beaker" />
      ),
      hidden: isMetricsTabHidden({
        agentName,
        cloudProviderAndService,
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
      hidden: isInfraTabHidden({ agentName, cloudProviderAndService }),
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
      append: isServerlessAgent(cloudProviderAndService) && (
        <TechnicalPreviewBadge icon="beaker" />
      ),
      hidden: !agentName || isRumAgentName(agentName) || isAzureFunctionsAgent(cloudProviderAndService),
    },
    {
      key: 'alerts',
      href: router.link('/services/{serviceName}/alerts', {
        path: { serviceName },
        query,
      }),
      prepend:
        serviceAlertsCount.alertsCount > 0 ? (
          <EuiBadge iconType="alert" color="danger">
            {serviceAlertsCount.alertsCount}
          </EuiBadge>
        ) : null,
      append: <TechnicalPreviewBadge icon="beaker" />,
      label: i18n.translate('xpack.apm.home.alertsTabLabel', {
        defaultMessage: 'Alerts',
      }),
      hidden: !(isAlertingAvailable && canReadAlerts),
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
    }));
}
