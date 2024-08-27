/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPageHeaderProps, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { omit } from 'lodash';
import React from 'react';
import { ApmServiceContextProvider } from '../../../../../context/apm_service/apm_service_context';
import { useBreadcrumb } from '../../../../../context/breadcrumbs/use_breadcrumb';
import { ServiceAnomalyTimeseriesContextProvider } from '../../../../../context/service_anomaly_timeseries/service_anomaly_timeseries_context';
import { useApmParams } from '../../../../../hooks/use_apm_params';
import { useApmRouter } from '../../../../../hooks/use_apm_router';
import { useTimeRange } from '../../../../../hooks/use_time_range';
import { SearchBar } from '../../../../shared/search_bar/search_bar';
import { ServiceIcons } from '../../../../shared/service_icons';
import { TechnicalPreviewBadge } from '../../../../shared/technical_preview_badge';
import { ApmMainTemplate } from '../../apm_main_template';

type Tab = NonNullable<EuiPageHeaderProps['tabs']>[0] & {
  key: 'overview' | 'logs' | 'dashboards';
  hidden?: boolean;
};

interface Props {
  title: string;
  children: React.ReactChild;
  selectedTabKey: Tab['key'];
  searchBarOptions?: React.ComponentProps<typeof SearchBar>;
}

export function LogsServiceTemplate(props: Props) {
  return (
    <ApmServiceContextProvider>
      <TemplateWithContext {...props} />
    </ApmServiceContextProvider>
  );
}

function TemplateWithContext({ title, children, selectedTabKey, searchBarOptions }: Props) {
  const {
    path: { serviceName },
    query,
    query: { rangeFrom, rangeTo, environment },
  } = useApmParams('/logs-services/{serviceName}/*');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const router = useApmRouter();

  const tabs = useTabs({ selectedTabKey });
  const selectedTab = tabs?.find(({ isSelected }) => isSelected);

  const servicesLink = router.link('/services', {
    query: { ...query },
  });

  useBreadcrumb(
    () => [
      {
        title: i18n.translate('xpack.apm.logServices.breadcrumb.title', {
          defaultMessage: 'Services',
        }),
        href: servicesLink,
      },
      ...(selectedTab
        ? [
            {
              title: serviceName,
              href: router.link('/logs-services/{serviceName}', {
                path: { serviceName },
                query,
              }),
            },
            {
              title: selectedTab.label,
              href: selectedTab.href,
            } as { title: string; href: string },
          ]
        : []),
    ],
    [query, router, selectedTab, serviceName, servicesLink]
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
                      {serviceName} <TechnicalPreviewBadge icon="beaker" />
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
          </EuiFlexGroup>
        ),
      }}
    >
      <SearchBar {...searchBarOptions} />
      <ServiceAnomalyTimeseriesContextProvider>{children}</ServiceAnomalyTimeseriesContextProvider>
    </ApmMainTemplate>
  );
}

function useTabs({ selectedTabKey }: { selectedTabKey: Tab['key'] }) {
  const router = useApmRouter();

  const {
    path: { serviceName },
    query: queryFromUrl,
  } = useApmParams(`/logs-services/{serviceName}/${selectedTabKey}` as const);

  const query = omit(queryFromUrl, 'page', 'pageSize', 'sortField', 'sortDirection');

  const tabs: Tab[] = [
    {
      key: 'overview',
      href: router.link('/logs-services/{serviceName}/overview', {
        path: { serviceName },
        query,
      }),
      label: i18n.translate('xpack.apm.logsServiceDetails.overviewTabLabel', {
        defaultMessage: 'Overview',
      }),
    },
    {
      key: 'logs',
      href: router.link('/logs-services/{serviceName}/logs', {
        path: { serviceName },
        query,
      }),
      label: i18n.translate('xpack.apm.logsServiceDetails.logsTabLabel', {
        defaultMessage: 'Logs',
      }),
    },
    {
      key: 'dashboards',
      href: router.link('/logs-services/{serviceName}/dashboards', {
        path: { serviceName },
        query,
      }),
      append: <TechnicalPreviewBadge icon="beaker" />,
      label: i18n.translate('xpack.apm.logsServiceDetails.dashboardsTabLabel', {
        defaultMessage: 'Dashboards',
      }),
    },
  ];

  return tabs
    .filter((t) => !t.hidden)
    .map(({ href, key, label, append }) => ({
      href,
      label,
      append,
      isSelected: key === selectedTabKey,
      'data-test-subj': `${key}Tab`,
    }));
}
