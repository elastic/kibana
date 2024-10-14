/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingLogo, EuiSpacer, EuiTitle } from '@elastic/eui';
import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { isLogsOnlySignal } from '../../../../utils/get_signal_type';
import { isMobileAgentName } from '../../../../../common/agent_name';
import { ApmServiceContextProvider } from '../../../../context/apm_service/apm_service_context';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useBreadcrumb } from '../../../../context/breadcrumbs/use_breadcrumb';
import { ServiceAnomalyTimeseriesContextProvider } from '../../../../context/service_anomaly_timeseries/service_anomaly_timeseries_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { isPending } from '../../../../hooks/use_fetcher';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { replace } from '../../../shared/links/url_helpers';
import { SearchBar } from '../../../shared/search_bar/search_bar';
import { ServiceIcons } from '../../../shared/service_icons';
import { ApmMainTemplate } from '../apm_main_template';
import { AnalyzeDataButton } from './analyze_data_button';
import { Tab, useTabs } from './use_tabs';

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

function TemplateWithContext({ title, children, selectedTab, searchBarOptions }: Props) {
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

  const { agentName, serviceAgentStatus, serviceEntitySummary } = useApmServiceContext();

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

  const hasLogsOnlySignal =
    serviceEntitySummary?.dataStreamTypes && isLogsOnlySignal(serviceEntitySummary.dataStreamTypes);

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
                    <h1 data-test-subj="apmMainTemplateHeaderServiceName">{serviceName}</h1>
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
          {!hasLogsOnlySignal && <SearchBar {...searchBarOptions} />}
          <ServiceAnomalyTimeseriesContextProvider>
            {children}
          </ServiceAnomalyTimeseriesContextProvider>
        </>
      )}
    </ApmMainTemplate>
  );
}
