/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTab } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { ReactNode } from 'react';
import { isJavaAgentName, isRumAgentName } from '../../../../common/agent_name';
import { enableServiceOverview } from '../../../../common/ui_settings_keys';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { useErrorOverviewHref } from '../../shared/Links/apm/ErrorOverviewLink';
import { useMetricOverviewHref } from '../../shared/Links/apm/MetricOverviewLink';
import { useServiceMapHref } from '../../shared/Links/apm/ServiceMapLink';
import { useServiceNodeOverviewHref } from '../../shared/Links/apm/ServiceNodeOverviewLink';
import { useServiceOverviewHref } from '../../shared/Links/apm/service_overview_link';
import { useTransactionsOverviewHref } from '../../shared/Links/apm/transaction_overview_link';
import { MainTabs } from '../../shared/main_tabs';
import { ErrorGroupOverview } from '../error_group_overview';
import { ServiceMap } from '../ServiceMap';
import { ServiceNodeOverview } from '../service_node_overview';
import { ServiceMetrics } from '../service_metrics';
import { ServiceOverview } from '../service_overview';
import { TransactionOverview } from '../transaction_overview';
import { Correlations } from '../correlations';

interface Tab {
  key: string;
  href: string;
  text: string;
  render: () => ReactNode;
}

interface Props {
  serviceName: string;
  tab:
    | 'errors'
    | 'metrics'
    | 'nodes'
    | 'overview'
    | 'service-map'
    | 'transactions';
}

export function ServiceDetailTabs({ serviceName, tab }: Props) {
  const { agentName } = useApmServiceContext();
  const { uiSettings } = useApmPluginContext().core;
  const {
    urlParams: { latencyAggregationType },
  } = useUrlParams();

  const overviewTab = {
    key: 'overview',
    href: useServiceOverviewHref(serviceName),
    text: i18n.translate('xpack.apm.serviceDetails.overviewTabLabel', {
      defaultMessage: 'Overview',
    }),
    render: () => (
      <ServiceOverview agentName={agentName} serviceName={serviceName} />
    ),
  };

  const transactionsTab = {
    key: 'transactions',
    href: useTransactionsOverviewHref({ serviceName, latencyAggregationType }),
    text: i18n.translate('xpack.apm.serviceDetails.transactionsTabLabel', {
      defaultMessage: 'Transactions',
    }),
    render: () => <TransactionOverview serviceName={serviceName} />,
  };

  const errorsTab = {
    key: 'errors',
    href: useErrorOverviewHref(serviceName),
    text: i18n.translate('xpack.apm.serviceDetails.errorsTabLabel', {
      defaultMessage: 'Errors',
    }),
    render: () => {
      return <ErrorGroupOverview serviceName={serviceName} />;
    },
  };

  const serviceMapTab = {
    key: 'service-map',
    href: useServiceMapHref(serviceName),
    text: i18n.translate('xpack.apm.home.serviceMapTabLabel', {
      defaultMessage: 'Service Map',
    }),
    render: () => <ServiceMap serviceName={serviceName} />,
  };

  const nodesListTab = {
    key: 'nodes',
    href: useServiceNodeOverviewHref(serviceName),
    text: i18n.translate('xpack.apm.serviceDetails.nodesTabLabel', {
      defaultMessage: 'JVMs',
    }),
    render: () => <ServiceNodeOverview serviceName={serviceName} />,
  };

  const metricsTab = {
    key: 'metrics',
    href: useMetricOverviewHref(serviceName),
    text: i18n.translate('xpack.apm.serviceDetails.metricsTabLabel', {
      defaultMessage: 'Metrics',
    }),
    render: () =>
      agentName ? (
        <ServiceMetrics agentName={agentName} serviceName={serviceName} />
      ) : null,
  };

  const tabs: Tab[] = [transactionsTab, errorsTab];

  if (uiSettings.get(enableServiceOverview)) {
    tabs.unshift(overviewTab);
  }

  if (isJavaAgentName(agentName)) {
    tabs.push(nodesListTab);
  } else if (agentName && !isRumAgentName(agentName)) {
    tabs.push(metricsTab);
  }

  tabs.push(serviceMapTab);

  const selectedTab = tabs.find((serviceTab) => serviceTab.key === tab);

  return (
    <>
      <MainTabs>
        {tabs.map(({ href, key, text }) => (
          <EuiTab href={href} isSelected={key === tab} key={key}>
            {text}
          </EuiTab>
        ))}
        <div style={{ marginLeft: 'auto' }}>
          <Correlations />
        </div>
      </MainTabs>
      {selectedTab ? selectedTab.render() : null}
    </>
  );
}
