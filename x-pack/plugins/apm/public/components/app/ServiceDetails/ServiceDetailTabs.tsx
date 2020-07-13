/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTabs } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { isJavaAgentName, isRumAgentName } from '../../../../common/agent_name';
import { useAgentName } from '../../../hooks/useAgentName';
import { useApmPluginContext } from '../../../hooks/useApmPluginContext';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { EuiTabLink } from '../../shared/EuiTabLink';
import { ErrorOverviewLink } from '../../shared/Links/apm/ErrorOverviewLink';
import { MetricOverviewLink } from '../../shared/Links/apm/MetricOverviewLink';
import { ServiceMapLink } from '../../shared/Links/apm/ServiceMapLink';
import { ServiceNodeOverviewLink } from '../../shared/Links/apm/ServiceNodeOverviewLink';
import { TransactionOverviewLink } from '../../shared/Links/apm/TransactionOverviewLink';
import { ErrorGroupOverview } from '../ErrorGroupOverview';
import { ServiceMap } from '../ServiceMap';
import { ServiceMetrics } from '../ServiceMetrics';
import { ServiceNodeOverview } from '../ServiceNodeOverview';
import { TransactionOverview } from '../TransactionOverview';

interface Props {
  tab: 'transactions' | 'errors' | 'metrics' | 'nodes' | 'service-map';
}

export function ServiceDetailTabs({ tab }: Props) {
  const { urlParams } = useUrlParams();
  const { serviceName } = urlParams;
  const { agentName } = useAgentName();
  const { serviceMapEnabled } = useApmPluginContext().config;

  if (!serviceName) {
    // this never happens, urlParams type is not accurate enough
    throw new Error('Service name was not defined');
  }

  const transactionsTab = {
    link: (
      <TransactionOverviewLink serviceName={serviceName}>
        {i18n.translate('xpack.apm.serviceDetails.transactionsTabLabel', {
          defaultMessage: 'Transactions',
        })}
      </TransactionOverviewLink>
    ),
    render: () => <TransactionOverview />,
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
      return <ErrorGroupOverview />;
    },
    name: 'errors',
  };

  const tabs = [transactionsTab, errorsTab];

  if (isJavaAgentName(agentName)) {
    const nodesListTab = {
      link: (
        <ServiceNodeOverviewLink serviceName={serviceName}>
          {i18n.translate('xpack.apm.serviceDetails.nodesTabLabel', {
            defaultMessage: 'JVMs',
          })}
        </ServiceNodeOverviewLink>
      ),
      render: () => <ServiceNodeOverview />,
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
      render: () => <ServiceMetrics agentName={agentName} />,
      name: 'metrics',
    };
    tabs.push(metricsTab);
  }

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

  if (serviceMapEnabled) {
    tabs.push(serviceMapTab);
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
