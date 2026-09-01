/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppHeaderTab } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { keyBy, omit } from 'lodash';
import {
  isAWSLambdaAgentName,
  isAzureFunctionsAgentName,
  isRumAgentName,
  isRumOrMobileAgentName,
  isServerlessAgentName,
} from '../../../../../common/agent_name';
import { ApmFeatureFlagName } from '../../../../../common/apm_feature_flags';
import type { ServerlessType } from '../../../../../common/serverless';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useApmFeatureFlag } from '../../../../hooks/use_apm_feature_flag';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { useProfilingPluginSetting } from '../../../../hooks/use_profiling_integration_setting';
import { getAlertingCapabilities } from '../../../alerting/utils/get_alerting_capabilities';

export type TabKey =
  | 'overview'
  | 'transactions'
  | 'dependencies'
  | 'errors'
  | 'metrics'
  | 'nodes'
  | 'infrastructure'
  | 'logs'
  | 'alerts'
  | 'profiling'
  | 'dashboards';

const technicalPreviewTooltip = i18n.translate('xpack.apm.technicalPreviewBadgeDescription', {
  defaultMessage:
    'This functionality is in technical preview and may be changed or removed completely in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.',
});

const apmOrderedTabs: TabKey[] = [
  'overview',
  'transactions',
  'dependencies',
  'errors',
  'metrics',
  'infrastructure',
  'logs',
  'alerts',
  'profiling',
  'dashboards',
];

export function isMetricsTabHidden({
  agentName,
  serverlessType,
}: {
  agentName?: string;
  serverlessType?: ServerlessType;
}) {
  if (isAWSLambdaAgentName(serverlessType)) {
    return false;
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

type ServiceTabDefinition = AppHeaderTab & {
  key: TabKey;
  hidden?: boolean;
  isTechnicalPreview?: boolean;
};

export function useTabs({ selectedTab }: { selectedTab: TabKey }): AppHeaderTab[] {
  const router = useApmRouter();
  const { agentName, serverlessType } = useApmServiceContext();
  const { core, plugins } = useApmPluginContext();
  const { capabilities } = core.application;
  const { isAlertingAvailable, canReadAlerts } = getAlertingCapabilities(plugins, capabilities);
  const isInfraTabAvailable = useApmFeatureFlag(ApmFeatureFlagName.InfrastructureTabAvailable);
  const isProfilingPluginEnabled = useProfilingPluginSetting();
  const {
    path: { serviceName },
    query: queryFromUrl,
  } = useApmParams(`/services/{serviceName}/${selectedTab}` as const);
  const query = omit(queryFromUrl, 'page', 'pageSize', 'sortField', 'sortDirection');

  const allTabsDefinitions: ServiceTabDefinition[] = [
    {
      key: 'overview',
      id: 'overview',
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
      id: 'transactions',
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
      id: 'dependencies',
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
      id: 'errors',
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
      id: 'metrics',
      href: router.link('/services/{serviceName}/metrics', {
        path: { serviceName },
        query,
      }),
      label: i18n.translate('xpack.apm.serviceDetails.metricsTabLabel', {
        defaultMessage: 'Metrics',
      }),
      isTechnicalPreview: isServerlessAgentName(serverlessType),
      hidden: isMetricsTabHidden({
        agentName,
        serverlessType,
      }),
    },
    {
      key: 'infrastructure',
      id: 'infrastructure',
      href: router.link('/services/{serviceName}/infrastructure', {
        path: { serviceName },
        query,
      }),
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
      key: 'logs',
      id: 'logs',
      href: router.link('/services/{serviceName}/logs', {
        path: { serviceName },
        query,
      }),
      label: i18n.translate('xpack.apm.home.serviceLogsTabLabel', {
        defaultMessage: 'Logs',
      }),
      isTechnicalPreview: isServerlessAgentName(serverlessType),
      hidden: !agentName || isRumAgentName(agentName) || isAzureFunctionsAgentName(serverlessType),
    },
    {
      key: 'alerts',
      id: 'alerts',
      href: router.link('/services/{serviceName}/alerts', {
        path: { serviceName },
        query,
      }),
      label: i18n.translate('xpack.apm.home.alertsTabLabel', {
        defaultMessage: 'Alerts',
      }),
      hidden: !(isAlertingAvailable && canReadAlerts),
    },
    {
      key: 'profiling',
      id: 'profiling',
      href: router.link('/services/{serviceName}/profiling', {
        path: { serviceName },
        query,
      }),
      label: i18n.translate('xpack.apm.home.profilingTabLabel', {
        defaultMessage: 'Universal Profiling',
      }),
      hidden:
        !isProfilingPluginEnabled ||
        isRumOrMobileAgentName(agentName) ||
        isAWSLambdaAgentName(serverlessType),
    },
    {
      key: 'dashboards',
      id: 'dashboards',
      href: router.link('/services/{serviceName}/dashboards', {
        path: { serviceName },
        query,
      }),
      label: i18n.translate('xpack.apm.home.dashboardsTabLabel', {
        defaultMessage: 'Dashboards',
      }),
      isTechnicalPreview: true,
    },
  ];

  const tabsGroupedByKey = keyBy(allTabsDefinitions, 'key');

  return apmOrderedTabs
    .map((key) => tabsGroupedByKey[key])
    .filter((t) => !t.hidden)
    .map(({ href, key, id, label, isTechnicalPreview }) => ({
      id,
      href,
      label,
      isSelected: key === selectedTab,
      'data-test-subj': `${key}Tab`,
      ...(isTechnicalPreview
        ? {
            badge: {
              iconType: 'flask',
              tooltip: technicalPreviewTooltip,
            },
          }
        : {}),
    }));
}
