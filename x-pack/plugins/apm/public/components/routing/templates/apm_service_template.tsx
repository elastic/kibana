/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiTabs,
  EuiTab,
  EuiBetaBadge,
} from '@elastic/eui';
import { ApmMainTemplate } from './apm_main_template';
import { ApmServiceContextProvider } from '../../../context/apm_service/apm_service_context';
import { enableServiceOverview } from '../../../../common/ui_settings_keys';
import { isJavaAgentName, isRumAgentName } from '../../../../common/agent_name';
import { ServiceIcons } from '../../shared/service_icons';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { useErrorOverviewHref } from '../../shared/Links/apm/ErrorOverviewLink';
import { useMetricOverviewHref } from '../../shared/Links/apm/MetricOverviewLink';
import { useServiceMapHref } from '../../shared/Links/apm/ServiceMapLink';
import { useServiceNodeOverviewHref } from '../../shared/Links/apm/ServiceNodeOverviewLink';
import { useServiceOverviewHref } from '../../shared/Links/apm/service_overview_link';
import { useServiceProfilingHref } from '../../shared/Links/apm/service_profiling_link';
import { useTransactionsOverviewHref } from '../../shared/Links/apm/transaction_overview_link';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { Correlations } from '../../app/correlations';
import { SearchBar } from '../../shared/search_bar';

interface Tab {
  key: TabKey;
  href: string;
  text: React.ReactNode;
  hidden?: boolean;
}

type TabKey =
  | 'errors'
  | 'metrics'
  | 'nodes'
  | 'overview'
  | 'service-map'
  | 'profiling'
  | 'transactions';

export function ApmServiceTemplate({
  children,
  serviceName,
  selectedTab,
  searchBarOptions,
}: {
  children: React.ReactNode;
  serviceName: string;
  selectedTab: TabKey;
  searchBarOptions?: {
    hidden?: boolean;
    showTransactionTypeSelector?: boolean;
    showTimeComparison?: boolean;
  };
}) {
  return (
    <ApmMainTemplate
      pageTitle={
        <>
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiTitle size="l">
                <h1>{serviceName}</h1>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ServiceIcons serviceName={serviceName} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      }
    >
      <ApmServiceContextProvider>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem>
            <TabNavigation
              serviceName={serviceName}
              selectedTab={selectedTab}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <Correlations />
          </EuiFlexItem>
        </EuiFlexGroup>

        <SearchBar {...searchBarOptions} />

        {children}
      </ApmServiceContextProvider>
    </ApmMainTemplate>
  );
}

function TabNavigation({
  serviceName,
  selectedTab,
}: {
  serviceName: string;
  selectedTab: TabKey;
}) {
  const { agentName, transactionType } = useApmServiceContext();
  const { core, config } = useApmPluginContext();
  const { urlParams } = useUrlParams();

  const tabs: Tab[] = [
    {
      key: 'overview',
      href: useServiceOverviewHref({ serviceName, transactionType }),
      text: i18n.translate('xpack.apm.serviceDetails.overviewTabLabel', {
        defaultMessage: 'Overview',
      }),
      hidden: !core.uiSettings.get(enableServiceOverview),
    },
    {
      key: 'transactions',
      href: useTransactionsOverviewHref({
        serviceName,
        latencyAggregationType: urlParams.latencyAggregationType,
        transactionType,
      }),
      text: i18n.translate('xpack.apm.serviceDetails.transactionsTabLabel', {
        defaultMessage: 'Transactions',
      }),
    },
    {
      key: 'errors',
      href: useErrorOverviewHref(serviceName),
      text: i18n.translate('xpack.apm.serviceDetails.errorsTabLabel', {
        defaultMessage: 'Errors',
      }),
    },
    {
      key: 'nodes',
      href: useServiceNodeOverviewHref(serviceName),
      text: i18n.translate('xpack.apm.serviceDetails.nodesTabLabel', {
        defaultMessage: 'JVMs',
      }),
      hidden: !isJavaAgentName(agentName),
    },
    {
      key: 'metrics',
      href: useMetricOverviewHref(serviceName),
      text: i18n.translate('xpack.apm.serviceDetails.metricsTabLabel', {
        defaultMessage: 'Metrics',
      }),
      hidden:
        !agentName || isRumAgentName(agentName) || isJavaAgentName(agentName),
    },
    {
      key: 'service-map',
      href: useServiceMapHref(serviceName),
      text: i18n.translate('xpack.apm.home.serviceMapTabLabel', {
        defaultMessage: 'Service Map',
      }),
    },
    {
      key: 'profiling',
      href: useServiceProfilingHref({ serviceName }),
      hidden: !config.profilingEnabled,
      text: (
        <EuiFlexGroup direction="row" gutterSize="s">
          <EuiFlexItem>
            {i18n.translate('xpack.apm.serviceDetails.profilingTabLabel', {
              defaultMessage: 'Profiling',
            })}
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiBetaBadge
              label={i18n.translate(
                'xpack.apm.serviceDetails.profilingTabExperimentalLabel',
                {
                  defaultMessage: 'Experimental',
                }
              )}
              tooltipContent={i18n.translate(
                'xpack.apm.serviceDetails.profilingTabExperimentalDescription',
                {
                  defaultMessage:
                    'Profiling is highly experimental and for internal use only.',
                }
              )}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
  ];

  return (
    <EuiTabs display="condensed">
      {tabs
        .filter((t) => !t.hidden)
        .map(({ href, key, text }) => (
          <EuiTab
            data-test-subj={`tab_${key}`}
            href={href}
            isSelected={key === selectedTab}
            key={key}
          >
            {text}
          </EuiTab>
        ))}
    </EuiTabs>
  );
}
