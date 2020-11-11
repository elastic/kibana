/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTabs } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { isJavaAgentName, isRumAgentName } from '../../../../common/agent_name';
import { enableServiceOverview } from '../../../../common/ui_settings_keys';
import { useAgentName } from '../../../hooks/useAgentName';
import { useApmPluginContext } from '../../../hooks/useApmPluginContext';
import { EuiTabLink } from '../../shared/EuiTabLink';
import { ErrorOverviewLink } from '../../shared/Links/apm/ErrorOverviewLink';
import { MetricOverviewLink } from '../../shared/Links/apm/MetricOverviewLink';
import { ServiceMapLink } from '../../shared/Links/apm/ServiceMapLink';
import { ServiceNodeOverviewLink } from '../../shared/Links/apm/ServiceNodeOverviewLink';
import { ServiceOverviewLink } from '../../shared/Links/apm/service_overview_link';
import { TransactionOverviewLink } from '../../shared/Links/apm/TransactionOverviewLink';
import { ErrorGroupOverview } from '../ErrorGroupOverview';
import { ServiceMap } from '../ServiceMap';
import { ServiceMetrics } from '../ServiceMetrics';
import { ServiceNodeOverview } from '../ServiceNodeOverview';
import { ServiceOverview } from '../service_overview';
import { TransactionOverview } from '../TransactionOverview';

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
  const { agentName } = useAgentName();
  const { uiSettings } = useApmPluginContext().core;

  const overviewTab = {
    link: (
      <ServiceOverviewLink serviceName={serviceName}>
        {i18n.translate('xpack.apm.serviceDetails.overviewTabLabel', {
          defaultMessage: 'Overview',
        })}
      </ServiceOverviewLink>
    ),
    render: () => (
      <ServiceOverview agentName={agentName} serviceName={serviceName} />
    ),
    name: 'overview',
  };

  const transactionsTab = {
    link: (
      <TransactionOverviewLink serviceName={serviceName}>
        {i18n.translate('xpack.apm.serviceDetails.transactionsTabLabel', {
          defaultMessage: 'Transactions',
        })}
      </TransactionOverviewLink>
    ),
    render: () => <TransactionOverview serviceName={serviceName} />,
    name: 'transactions',
  };

  const errorsTab = {
    link: (
      <ErrorOverviewLink serviceName={serviceName}>
        {i18n.translate('xpack.apm.serviceDetails.errorsTabLabel', {
          defaultMessage: 'Errors',
        })}
      </ErrorOverviewLink>
    ),
    render: () => {
      return <ErrorGroupOverview serviceName={serviceName} />;
    },
    name: 'errors',
  };

  const serviceMapTab = {
    link: (
      <ServiceMapLink serviceName={serviceName}>
        {i18n.translate('xpack.apm.home.serviceMapTabLabel', {
          defaultMessage: 'Service Map',
        })}
      </ServiceMapLink>
    ),
    render: () => <ServiceMap serviceName={serviceName} />,
    name: 'service-map',
  };

  const tabs = [transactionsTab, errorsTab, serviceMapTab];

  if (uiSettings.get(enableServiceOverview)) {
    tabs.unshift(overviewTab);
  }

  if (isJavaAgentName(agentName)) {
    const nodesListTab = {
      link: (
        <ServiceNodeOverviewLink serviceName={serviceName}>
          {i18n.translate('xpack.apm.serviceDetails.nodesTabLabel', {
            defaultMessage: 'JVMs',
          })}
        </ServiceNodeOverviewLink>
      ),
      render: () => <ServiceNodeOverview serviceName={serviceName} />,
      name: 'nodes',
    };
    tabs.push(nodesListTab);
  } else if (agentName && !isRumAgentName(agentName)) {
    const metricsTab = {
      link: (
        <MetricOverviewLink serviceName={serviceName}>
          {i18n.translate('xpack.apm.serviceDetails.metricsTabLabel', {
            defaultMessage: 'Metrics',
          })}
        </MetricOverviewLink>
      ),
      render: () => (
        <ServiceMetrics agentName={agentName} serviceName={serviceName} />
      ),
      name: 'metrics',
    };
    tabs.push(metricsTab);
  }

  const selectedTab = tabs.find((serviceTab) => serviceTab.name === tab);

  return (
    <>
      <EuiTabs>
        {tabs.map((serviceTab) => (
          <EuiTabLink
            isSelected={serviceTab.name === tab}
            key={serviceTab.name}
          >
            {serviceTab.link}
          </EuiTabLink>
        ))}
      </EuiTabs>
      {selectedTab ? selectedTab.render() : null}
    </>
  );
}
