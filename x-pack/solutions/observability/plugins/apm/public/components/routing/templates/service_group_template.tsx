/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import type { AppHeaderTab } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import type { KibanaPageTemplateProps } from '@kbn/shared-ux-page-kibana-template';
import React, { useMemo, useState } from 'react';
import { ApmIndexSettingsContextProvider } from '../../../context/apm_index_settings/apm_index_settings_context';
import { useBreadcrumb } from '../../../context/breadcrumbs/use_breadcrumb';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { isPending, useFetcher } from '../../../hooks/use_fetcher';
import { SaveGroupModal } from '../../app/service_groups/service_group_save/save_modal';
import { ApmMainTemplate } from './apm_main_template';

export function ServiceGroupTemplate({
  pageTitle,
  pagePath,
  children,
  searchBar,
  serviceGroupContextTab,
  ...pageTemplateProps
}: {
  pageTitle: string;
  pagePath: string;
  children: React.ReactNode;
  searchBar?: React.ReactNode;
  serviceGroupContextTab: ServiceGroupContextTabKey;
} & KibanaPageTemplateProps) {
  const router = useApmRouter();
  const {
    query,
    query: { serviceGroup: serviceGroupId },
  } = useAnyOfApmParams('/services', '/service-map', '/service-groups');

  const { data, status } = useFetcher(
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
  const savedServiceGroup = data?.serviceGroup;
  const isAllServices = !serviceGroupId;
  const linkQuery = useMemo(
    () => ({ ...query, serviceGroup: serviceGroupId ?? '' }),
    [query, serviceGroupId]
  );
  const serviceGroupsLink = router.link('/service-groups', {
    query: { ...linkQuery, serviceGroup: '' },
  });

  const [isEditGroupModalOpen, setIsEditGroupModalOpen] = useState(false);

  const tabs = useTabs(serviceGroupContextTab, isAllServices);
  const selectedTab = tabs.find(({ isSelected }) => isSelected);

  // Classic chrome breadcrumbs only — AppHeader uses explicit `back` when filtered.
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
              href: router.link('/services', { query: linkQuery }),
            },
            {
              title: i18n.translate('xpack.apm.serviceGroups.breadcrumb.title', {
                defaultMessage: 'Service groups',
              }),
              href: serviceGroupsLink,
            },
            // No href on the current entity — Chrome Next Back would self-link.
            {
              title: serviceGroupName,
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
    [pagePath, pageTitle, linkQuery, router, selectedTab, serviceGroupName, serviceGroupsLink],
    {
      omitRootOnServerless: true,
    }
  );

  const headerTitle = serviceGroupName ?? (!isAllServices && isPending(status) ? '' : pageTitle);

  const pageMenu = useMemo<AppMenuConfig | undefined>(() => {
    if (isAllServices) {
      return undefined;
    }

    return {
      primaryActionItem: {
        id: 'editServiceGroup',
        label: i18n.translate('xpack.apm.serviceGroups.editGroupLabel', {
          defaultMessage: 'Edit group',
        }),
        iconType: 'pencil',
        testId: 'apmEditButtonEditGroupButton',
        disableButton: !savedServiceGroup,
        isLoading: isPending(status),
        run: () => {
          setIsEditGroupModalOpen(true);
        },
      },
    };
  }, [isAllServices, savedServiceGroup, status]);

  const appHeaderTabs: AppHeaderTab[] = tabs.map(
    ({ id, label, href, isSelected, 'data-test-subj': dataTestSubj }) => ({
      id,
      label,
      href,
      isSelected,
      'data-test-subj': dataTestSubj,
    })
  );

  return (
    <ApmIndexSettingsContextProvider>
      <ApmMainTemplate
        header={{
          title: headerTitle,
          tabs: appHeaderTabs,
          back: isAllServices
            ? undefined
            : {
                href: serviceGroupsLink,
                label: i18n.translate('xpack.apm.serviceGroups.breadcrumb.title', {
                  defaultMessage: 'Service groups',
                }),
              },
          menu: pageMenu,
        }}
        searchBar={searchBar}
        {...pageTemplateProps}
      >
        {children}
      </ApmMainTemplate>
      {isEditGroupModalOpen && (
        <SaveGroupModal
          savedServiceGroup={savedServiceGroup}
          onClose={() => {
            setIsEditGroupModalOpen(false);
          }}
        />
      )}
    </ApmIndexSettingsContextProvider>
  );
}

type ServiceGroupContextTabKey = 'service-inventory' | 'service-map' | 'service-groups';

type ServiceGroupContextTab = AppHeaderTab & {
  id: ServiceGroupContextTabKey;
  breadcrumbLabel?: string;
  hidden?: boolean;
};

function useTabs(
  selectedTab: ServiceGroupContextTabKey,
  isAllServices?: boolean
): ServiceGroupContextTab[] {
  const router = useApmRouter();
  const {
    query,
    query: { serviceGroup: serviceGroupId },
  } = useAnyOfApmParams('/services', '/service-map', '/service-groups');

  const linkQuery = { ...query, serviceGroup: serviceGroupId ?? '' };

  const tabs: ServiceGroupContextTab[] = [
    {
      id: 'service-inventory',
      'data-test-subj': 'serviceInventoryTab',
      breadcrumbLabel: i18n.translate('xpack.apm.serviceGroup.serviceInventory', {
        defaultMessage: 'Inventory',
      }),
      label: i18n.translate('xpack.apm.serviceGroup.serviceInventory', {
        defaultMessage: 'Inventory',
      }),
      href: router.link('/services', { query: linkQuery }),
    },
    {
      id: 'service-map',
      'data-test-subj': 'serviceMapTab',
      label: i18n.translate('xpack.apm.serviceGroup.serviceMap', {
        defaultMessage: 'Service map',
      }),
      href: router.link('/service-map', { query: linkQuery }),
    },
    {
      id: 'service-groups',
      'data-test-subj': 'serviceGroupsTab',
      label: i18n.translate('xpack.apm.serviceGroup.serviceGroups', {
        defaultMessage: 'Service groups',
      }),
      href: router.link('/service-groups', { query: linkQuery }),
      hidden: isAllServices === false,
    },
  ];

  return tabs
    .filter((t) => !t.hidden)
    .map((tab) => ({
      ...tab,
      isSelected: tab.id === selectedTab,
    }));
}
