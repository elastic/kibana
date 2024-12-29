/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiPageHeaderProps, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { enableAwsLambdaMetrics } from '@kbn/observability-plugin/common';
import { keyBy, omit } from 'lodash';
import React from 'react';
import {
  isAWSLambdaAgentName,
  isAzureFunctionsAgentName,
  isRumAgentName,
  isRumOrMobileAgentName,
  isServerlessAgentName,
} from '../../../../../common/agent_name';
import { ApmFeatureFlagName } from '../../../../../common/apm_feature_flags';
import { ServerlessType } from '../../../../../common/serverless';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useApmFeatureFlag } from '../../../../hooks/use_apm_feature_flag';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { useProfilingIntegrationSetting } from '../../../../hooks/use_profiling_integration_setting';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { isApmSignal, isLogsSignal } from '../../../../utils/get_signal_type';
import { getAlertingCapabilities } from '../../../alerting/utils/get_alerting_capabilities';
import { BetaBadge } from '../../../shared/beta_badge';
import { TechnicalPreviewBadge } from '../../../shared/technical_preview_badge';

export type Tab = NonNullable<EuiPageHeaderProps['tabs']>[0] & {
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

const apmOrderedTabs: Array<Tab['key']> = [
  'overview',
  'transactions',
  'dependencies',
  'errors',
  'metrics',
  'infrastructure',
  'service-map',
  'logs',
  'alerts',
  'profiling',
  'dashboards',
];
const logsOnlyOrderedTabs: Array<Tab['key']> = [
  'overview',
  'logs',
  'dashboards',
  'transactions',
  'dependencies',
  'errors',
  'metrics',
  'infrastructure',
  'service-map',
  'alerts',
  'profiling',
];

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
  return !agentName || isRumAgentName(agentName) || isAzureFunctionsAgentName(serverlessType);
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

export function useTabs({ selectedTab }: { selectedTab: Tab['key'] }) {
  const router = useApmRouter();
  const { agentName, serverlessType, serviceEntitySummary } = useApmServiceContext();
  const { core, plugins } = useApmPluginContext();
  const { capabilities } = core.application;
  const isAwsLambdaEnabled = core.uiSettings.get<boolean>(enableAwsLambdaMetrics, true);
  const { isAlertingAvailable, canReadAlerts } = getAlertingCapabilities(plugins, capabilities);
  const isInfraTabAvailable = useApmFeatureFlag(ApmFeatureFlagName.InfrastructureTabAvailable);
  const isProfilingIntegrationEnabled = useProfilingIntegrationSetting();
  const {
    path: { serviceName },
    query: queryFromUrl,
  } = useApmParams(`/services/{serviceName}/${selectedTab}` as const);
  const query = omit(queryFromUrl, 'page', 'pageSize', 'sortField', 'sortDirection');

  const { rangeFrom, rangeTo, environment } = queryFromUrl;
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { data: serviceAlertsCount = { alertsCount: 0 } } = useFetcher(
    (callApmApi) => {
      return callApmApi('GET /internal/apm/services/{serviceName}/alerts_count', {
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
      });
    },
    [serviceName, start, end, environment]
  );

  const allTabsDefinitions: Tab[] = [
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
      append: isServerlessAgentName(serverlessType) && <TechnicalPreviewBadge icon="beaker" />,
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
      append: isServerlessAgentName(serverlessType) && <TechnicalPreviewBadge icon="beaker" />,
      hidden: !agentName || isRumAgentName(agentName) || isAzureFunctionsAgentName(serverlessType),
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

  const hasLogsSignal =
    serviceEntitySummary?.dataStreamTypes && isLogsSignal(serviceEntitySummary.dataStreamTypes);

  const hasApmSignal =
    serviceEntitySummary?.dataStreamTypes && isApmSignal(serviceEntitySummary.dataStreamTypes);

  const isLogsOnlyView = hasLogsSignal && !hasApmSignal;

  const tabsGroupedByKey = keyBy(allTabsDefinitions, 'key');
  const tabKeys = isLogsOnlyView ? logsOnlyOrderedTabs : apmOrderedTabs;

  return tabKeys
    .map((key) => tabsGroupedByKey[key])
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
