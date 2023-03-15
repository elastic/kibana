/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCollapsibleNavGroup, EuiListGroup } from '@elastic/eui';
import { ApplicationStart, HttpSetup } from '@kbn/core/public';

export interface ServerlessSearchCollapsibleNavigationProps {
  http: HttpSetup;
  navigateToUrl: ApplicationStart['navigateToUrl'];
}

export const ServerlessSearchCollapsibleNavigation = ({
  http,
  navigateToUrl,
}: ServerlessSearchCollapsibleNavigationProps) => {
  const navigateTo = (url: string) => () => {
    navigateToUrl(http.basePath.prepend(url));
  };
  const navItems = [
    {
      label: 'Overview',
      onClick: navigateTo('/app/enterprise_search/overview'),
    },
    {
      label: 'Indices',
      onClick: navigateTo('/app/enterprise_search/content/search_indices'),
    },
    // {
    //   label: 'Engines',
    //   onClick: navigateTo('/app/enterprise_search/content/engines'),
    // },
    {
      label: 'API keys',
      onClick: navigateTo('/app/management/security/api_keys'),
    },
    // {
    //   label: 'Ingest pipelines',
    //   onClick: navigateTo('/app/management/ingest/ingest_pipelines'),
    // },
  ];

  return (
    <>
      <EuiCollapsibleNavGroup title="Search" iconType="logoEnterpriseSearch" isCollapsible={false}>
        <EuiListGroup listItems={navItems} />
      </EuiCollapsibleNavGroup>
    </>
  );
};
