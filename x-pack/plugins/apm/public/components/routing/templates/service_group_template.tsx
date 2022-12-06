/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiPageHeaderProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingContent,
  EuiIcon,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { KibanaPageTemplateProps } from '@kbn/shared-ux-page-kibana-template';
import { useFetcher } from '../../../hooks/use_fetcher';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { ApmMainTemplate } from './apm_main_template';
import { useBreadcrumb } from '../../../context/breadcrumbs/use_breadcrumb';

export function ServiceGroupTemplate({
  pageTitle,
  pageHeader,
  children,
  environmentFilter = true,
  serviceGroupContextTab,
  ...pageTemplateProps
}: {
  pageTitle?: React.ReactNode;
  pageHeader?: EuiPageHeaderProps;
  children: React.ReactNode;
  environmentFilter?: boolean;
  serviceGroupContextTab: ServiceGroupContextTab['key'];
} & KibanaPageTemplateProps) {
  const router = useApmRouter();
  const {
    query,
    query: { serviceGroup: serviceGroupId },
  } = useAnyOfApmParams('/services', '/service-map');

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
        {loadingServiceGroupName ? (
          <EuiLoadingContent lines={2} style={{ width: 180, height: 40 }} />
        ) : (
          serviceGroupName ||
          i18n.translate('xpack.apm.serviceGroup.allServices.title', {
            defaultMessage: 'Services',
          })
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const tabs = useTabs(serviceGroupContextTab);
  const selectedTab = tabs?.find(({ isSelected }) => isSelected);
  useBreadcrumb(
    () => [
      {
        title: i18n.translate('xpack.apm.serviceGroups.breadcrumb.title', {
          defaultMessage: 'Services',
        }),
        href: serviceGroupsLink,
      },
      ...(selectedTab
        ? [
            ...(serviceGroupName
              ? [
                  {
                    title: serviceGroupName,
                    href: router.link('/services', { query }),
                  },
                ]
              : []),
            {
              title: selectedTab.label,
              href: selectedTab.href,
            } as { title: string; href: string },
          ]
        : []),
    ],
    [query, router, selectedTab, serviceGroupName, serviceGroupsLink]
  );
  return (
    <ApmMainTemplate
      pageTitle={serviceGroupsPageTitle}
      pageHeader={{
        tabs,
        breadcrumbs: !isAllServices
          ? [
              {
                text: (
                  <>
                    <EuiIcon size="s" type="arrowLeft" />{' '}
                    {i18n.translate(
                      'xpack.apm.serviceGroups.breadcrumb.return',
                      { defaultMessage: 'Return' }
                    )}
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
      environmentFilter={environmentFilter}
      showServiceGroupSaveButton={!isAllServices}
      showServiceGroupsNav={isAllServices}
      selectedNavButton={isAllServices ? 'allServices' : 'serviceGroups'}
      {...pageTemplateProps}
    >
      {children}
    </ApmMainTemplate>
  );
}

type ServiceGroupContextTab = NonNullable<EuiPageHeaderProps['tabs']>[0] & {
  key: 'service-inventory' | 'service-map';
};

function useTabs(selectedTab: ServiceGroupContextTab['key']) {
  const router = useApmRouter();
  const { query } = useAnyOfApmParams('/services', '/service-map');

  const tabs: ServiceGroupContextTab[] = [
    {
      key: 'service-inventory',
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
  ];

  return tabs
    .filter((t) => !t.hidden)
    .map(({ href, key, label }) => ({
      href,
      label,
      isSelected: key === selectedTab,
    }));
}
