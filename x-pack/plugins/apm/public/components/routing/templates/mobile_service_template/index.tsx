/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageHeaderProps,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { omit } from 'lodash';
import React from 'react';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { ApmServiceContextProvider } from '../../../../context/apm_service/apm_service_context';
import { useBreadcrumb } from '../../../../context/breadcrumbs/use_breadcrumb';
import { ServiceAnomalyTimeseriesContextProvider } from '../../../../context/service_anomaly_timeseries/service_anomaly_timeseries_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { getAlertingCapabilities } from '../../../alerting/utils/get_alerting_capabilities';
import { MobileSearchBar } from '../../../app/mobile/search_bar';
import { ServiceIcons } from '../../../shared/service_icons';
import { TechnicalPreviewBadge } from '../../../shared/technical_preview_badge';
import { ApmMainTemplate } from '../apm_main_template';
import { AnalyzeDataButton } from '../apm_service_template/analyze_data_button';

type Tab = NonNullable<EuiPageHeaderProps['tabs']>[0] & {
  key: 'overview' | 'transactions' | 'service-map' | 'alerts';
  hidden?: boolean;
};

interface Props {
  title: string;
  children: React.ReactChild;
  selectedTab: Tab['key'];
  searchBarOptions?: React.ComponentProps<typeof MobileSearchBar>;
}

export function MobileServiceTemplate(props: Props) {
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
  } = useApmParams('/mobile-services/{serviceName}/*');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const router = useApmRouter();

  const tabs = useTabs({ selectedTab });

  useBreadcrumb(
    () => ({
      title,
      href: router.link(
        `/mobile-services/{serviceName}/${selectedTab}` as const,
        {
          path: { serviceName },
          query,
        }
      ),
    }),
    [query, router, selectedTab, serviceName, title]
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
                <EuiFlexItem grow={false}>
                  <TechnicalPreviewBadge />
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
      <MobileSearchBar {...searchBarOptions} />
      <ServiceAnomalyTimeseriesContextProvider>
        {children}
      </ServiceAnomalyTimeseriesContextProvider>
    </ApmMainTemplate>
  );
}

function useTabs({ selectedTab }: { selectedTab: Tab['key'] }) {
  const { core, plugins } = useApmPluginContext();
  const { capabilities } = core.application;
  const { isAlertingAvailable, canReadAlerts } = getAlertingCapabilities(
    plugins,
    capabilities
  );

  const router = useApmRouter();

  const {
    path: { serviceName },
    query: queryFromUrl,
  } = useApmParams(`/mobile-services/{serviceName}/${selectedTab}` as const);

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
      href: router.link('/mobile-services/{serviceName}/overview', {
        path: { serviceName },
        query,
      }),
      label: i18n.translate('xpack.apm.mobileServiceDetails.overviewTabLabel', {
        defaultMessage: 'Overview',
      }),
    },
    {
      key: 'transactions',
      href: router.link('/mobile-services/{serviceName}/transactions', {
        path: { serviceName },
        query,
      }),
      label: i18n.translate(
        'xpack.apm.mobileServiceDetails.transactionsTabLabel',
        {
          defaultMessage: 'Transactions',
        }
      ),
    },
    {
      key: 'service-map',
      href: router.link('/mobile-services/{serviceName}/service-map', {
        path: { serviceName },
        query,
      }),
      label: i18n.translate(
        'xpack.apm.mobileServiceDetails.serviceMapTabLabel',
        {
          defaultMessage: 'Service Map',
        }
      ),
    },
    {
      key: 'alerts',
      href: router.link('/mobile-services/{serviceName}/alerts', {
        path: { serviceName },
        query,
      }),
      append: <TechnicalPreviewBadge icon="beaker" />,
      label: i18n.translate('xpack.apm.mobileServiceDetails.alertsTabLabel', {
        defaultMessage: 'Alerts',
      }),
      hidden: !(isAlertingAvailable && canReadAlerts),
    },
  ];

  return tabs
    .filter((t) => !t.hidden)
    .map(({ href, key, label, append }) => ({
      href,
      label,
      append,
      isSelected: key === selectedTab,
    }));
}
