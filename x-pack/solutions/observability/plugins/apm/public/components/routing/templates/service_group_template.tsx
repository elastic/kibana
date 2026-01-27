/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiPageHeaderProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiSkeletonTitle, EuiIcon, EuiBetaBadge } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { KibanaPageTemplateProps } from '@kbn/shared-ux-page-kibana-template';
import { useFetcher } from '../../../hooks/use_fetcher';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { ApmMainTemplate } from './apm_main_template';
import { useBreadcrumb } from '../../../context/breadcrumbs/use_breadcrumb';
import { useApmFeatureFlag } from '../../../hooks/use_apm_feature_flag';
import { ApmFeatureFlagName } from '../../../../common/apm_feature_flags';

export function ServiceGroupTemplate({
  pageTitle,
  pageHeader,
  pagePath,
  children,
  environmentFilter = true,
  serviceGroupContextTab,
  ...pageTemplateProps
}: {
  pageTitle: string;
  pageHeader?: EuiPageHeaderProps;
  pagePath: string;
  children: React.ReactNode;
  environmentFilter?: boolean;
  serviceGroupContextTab: ServiceGroupContextTab['key'];
} & KibanaPageTemplateProps) {
  const router = useApmRouter();
  const {
    query,
    query: { serviceGroup: serviceGroupId },
  } = useAnyOfApmParams('/services', '/service-map', '/react-flow-service-map');

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
  const selectedTab = tabs.find(({ isSelected }) => isSelected);

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
                    {i18n.translate('xpack.apm.serviceGroups.breadcrumb.return', {
                      defaultMessage: 'Return to service groups',
                    })}
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
  key: 'service-inventory' | 'service-map' | 'react-flow-service-map';
  breadcrumbLabel?: string;
  hidden?: boolean;
};

function useTabs(selectedTab: ServiceGroupContextTab['key']) {
  const router = useApmRouter();
  const { query } = useAnyOfApmParams('/services', '/service-map', '/react-flow-service-map');
  const isReactFlowServiceMapEnabled = useApmFeatureFlag(ApmFeatureFlagName.ServiceMapUseReactFlow);

  const tabs: ServiceGroupContextTab[] = [
    {
      key: 'service-inventory',
      breadcrumbLabel: i18n.translate('xpack.apm.serviceGroup.serviceInventory', {
        defaultMessage: 'Inventory',
      }),
      label: (
        <EuiFlexGroup justifyContent="flexStart" alignItems="baseline" gutterSize="s">
          <EuiFlexItem grow={false}>
            {i18n.translate('xpack.apm.serviceGroup.serviceInventory', {
              defaultMessage: 'Inventory',
            })}
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
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
      key: 'react-flow-service-map',
      label: (
        <EuiFlexGroup justifyContent="flexStart" alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            {i18n.translate('xpack.apm.serviceGroup.reactFlowServiceMap', {
              defaultMessage: 'React Flow Service map',
            })}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBetaBadge
              label={i18n.translate('xpack.apm.serviceGroup.reactFlowServiceMap.pocBadge', {
                defaultMessage: 'POC',
              })}
              size="s"
              color="hollow"
              tooltipContent={i18n.translate(
                'xpack.apm.serviceGroup.reactFlowServiceMap.pocTooltip',
                {
                  defaultMessage:
                    'This is a proof of concept implementation using React Flow to replace Cytoscape.js for improved accessibility.',
                }
              )}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
      href: router.link('/react-flow-service-map', { query }),
      hidden: !isReactFlowServiceMapEnabled,
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
