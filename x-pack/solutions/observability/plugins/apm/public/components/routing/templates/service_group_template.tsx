/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiPageHeaderProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiSkeletonTitle, EuiIcon } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { KibanaPageTemplateProps } from '@kbn/shared-ux-page-kibana-template';
import { useFetcher } from '../../../hooks/use_fetcher';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { ApmMainTemplate } from './apm_main_template';
import { useBreadcrumb } from '../../../context/breadcrumbs/use_breadcrumb';
import { ApmIndexSettingsContextProvider } from '../../../context/apm_index_settings/apm_index_settings_context';

export function ServiceGroupTemplate({
  pageTitle,
  pageHeader,
  pagePath,
  children,
  searchBar,
  serviceGroupContextTab,
  ...pageTemplateProps
}: {
  pageTitle: string;
  pageHeader?: EuiPageHeaderProps;
  pagePath: string;
  children: React.ReactNode;
  searchBar?: React.ReactNode;
  serviceGroupContextTab: ServiceGroupContextTab['key'];
} & KibanaPageTemplateProps) {
  const router = useApmRouter();
  const {
    query,
    query: { serviceGroup: serviceGroupId },
  } = useAnyOfApmParams('/services', '/service-map', '/service-groups');

  const { data } = useFetcher(
    (callApmApi) => {
      if (serviceGroupId) {
        return callApmApi('GET /internal/apm/service-group', {
          params: { query: { serviceGroup: serviceGroupId } },
        });
      }
    },
    [serviceGroupId]
  );

  const serviceGroupName = data?.serviceGroup.groupName;
  const loadingServiceGroupName = !!serviceGroupId && !serviceGroupName;
  const isAllServices = !serviceGroupId;
  const serviceGroupsLink = router.link('/service-groups', {
    query: { ...query, serviceGroup: '' },
  });

  const serviceGroupsPageTitle = (
    <EuiFlexGroup
      direction="row"
      gutterSize="m"
      alignItems="center"
      justifyContent="flexStart"
      responsive={false}
    >
      <EuiFlexItem grow={false}>
        <EuiSkeletonTitle size="l" style={{ width: 180 }} isLoading={loadingServiceGroupName}>
          {serviceGroupName ||
            i18n.translate('xpack.apm.serviceGroup.allServices.title', {
              defaultMessage: 'Service inventory',
            })}
        </EuiSkeletonTitle>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const tabs = useTabs(serviceGroupContextTab);
  const selectedTab = tabs?.find(({ isSelected }) => isSelected);

  // this is only used for building the breadcrumbs for the service group page
  useBreadcrumb(
    () =>
      !serviceGroupName
        ? [
            {
              title: pageTitle,
              href: pagePath,
            },
          ]
        : [
            {
              title: i18n.translate('xpack.apm.serviceInventory.breadcrumb.title', {
                defaultMessage: 'Service inventory',
              }),
              href: router.link('/services', { query }),
            },
            {
              title: i18n.translate('xpack.apm.serviceGroups.breadcrumb.title', {
                defaultMessage: 'Service groups',
              }),
              href: serviceGroupsLink,
            },
            {
              title: serviceGroupName,
              href: router.link('/services', { query }),
            },
            ...(selectedTab
              ? [
                  {
                    title: selectedTab.breadcrumbLabel || selectedTab.label,
                    href: selectedTab.href,
                  } as { title: string; href: string },
                ]
              : []),
          ],
    [pagePath, pageTitle, query, router, selectedTab, serviceGroupName, serviceGroupsLink],
    {
      omitRootOnServerless: true,
    }
  );

  const returnToServiceGroupsBreadcrumbLabel = i18n.translate(
    'xpack.apm.serviceGroups.breadcrumb.return',
    {
      defaultMessage: 'Return to service groups',
    }
  );

  return (
    <ApmIndexSettingsContextProvider>
      <ApmMainTemplate
        pageTitle={serviceGroupsPageTitle}
        searchBar={searchBar}
        pageHeader={{
          tabs,
          breadcrumbs: !isAllServices
            ? [
                {
                  text: (
                    <>
                      <EuiIcon
                        aria-label={returnToServiceGroupsBreadcrumbLabel}
                        size="s"
                        type="arrowLeft"
                      />{' '}
                      {returnToServiceGroupsBreadcrumbLabel}
                    </>
                  ),
                  color: 'primary',
                  'aria-current': false,
                  href: serviceGroupsLink,
                },
              ]
            : undefined,
          ...pageHeader,
        }}
        showServiceGroupSaveButton={!isAllServices}
        {...pageTemplateProps}
      >
        {children}
      </ApmMainTemplate>
    </ApmIndexSettingsContextProvider>
  );
}

type ServiceGroupContextTab = NonNullable<EuiPageHeaderProps['tabs']>[0] & {
  key: 'service-inventory' | 'service-map' | 'service-groups';
  breadcrumbLabel?: string;
};

function useTabs(selectedTab: ServiceGroupContextTab['key']) {
  const router = useApmRouter();
  const { query } = useAnyOfApmParams('/services', '/service-map', '/service-groups');

  const tabs: ServiceGroupContextTab[] = [
    {
      key: 'service-inventory',
      breadcrumbLabel: i18n.translate('xpack.apm.serviceGroup.serviceInventory', {
        defaultMessage: 'Inventory',
      }),
      label: i18n.translate('xpack.apm.serviceGroup.serviceInventory', {
        defaultMessage: 'Inventory',
      }),
      href: router.link('/services', { query }),
    },
    {
      key: 'service-map',
      label: i18n.translate('xpack.apm.serviceGroup.serviceMap', {
        defaultMessage: 'Service map',
      }),
      href: router.link('/service-map', { query }),
    },
    {
      key: 'service-groups',
      label: i18n.translate('xpack.apm.serviceGroup.serviceGroups', {
        defaultMessage: 'Service groups',
      }),
      href: router.link('/service-groups', { query }),
    },
  ];

  return tabs
    .filter((t) => !t.hidden)
    .map(({ href, key, label, breadcrumbLabel }) => ({
      href,
      label,
      isSelected: key === selectedTab,
      breadcrumbLabel,
    }));
}
