/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useParams } from 'react-router-dom';
import { PageView, PageViewProps } from '../../common/components/endpoint/page_view';
import { ManagementSubTab } from '../types';
import { SecurityPageName } from '../../app/types';
import { useFormatUrl } from '../../common/components/link_to';
import { getHostListPath, getPoliciesPath } from '../common/routing';
import { useNavigateByRouterEventHandler } from '../../common/hooks/endpoint/use_navigate_by_router_event_handler';

export const ManagementPageView = memo<Omit<PageViewProps, 'tabs'>>((options) => {
  const { formatUrl, search } = useFormatUrl(SecurityPageName.management);
  const { tabName } = useParams<{ tabName: ManagementSubTab }>();

  const goToEndpoint = useNavigateByRouterEventHandler(
    getHostListPath({ name: 'hostList' }, search)
  );

  const goToPolicies = useNavigateByRouterEventHandler(getPoliciesPath(search));

  const tabs = useMemo((): PageViewProps['tabs'] | undefined => {
    if (options.viewType === 'details') {
      return undefined;
    }
    return [
      {
        name: i18n.translate('xpack.securitySolution.managementTabs.endpoints', {
          defaultMessage: 'Hosts',
        }),
        id: ManagementSubTab.hosts,
        isSelected: tabName === ManagementSubTab.hosts,
        href: formatUrl(getHostListPath({ name: 'hostList' })),
        onClick: goToEndpoint,
      },
      {
        name: i18n.translate('xpack.securitySolution.managementTabs.policies', {
          defaultMessage: 'Policies',
        }),
        id: ManagementSubTab.policies,
        isSelected: tabName === ManagementSubTab.policies,
        href: formatUrl(getPoliciesPath()),
        onClick: goToPolicies,
      },
    ];
  }, [formatUrl, goToEndpoint, goToPolicies, options.viewType, tabName]);
  return <PageView {...options} tabs={tabs} />;
});

ManagementPageView.displayName = 'ManagementPageView';
