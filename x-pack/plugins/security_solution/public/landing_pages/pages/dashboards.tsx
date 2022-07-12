/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiHorizontalRule, EuiSpacer, EuiTitle } from '@elastic/eui';
import React from 'react';
import { SecurityPageName } from '../../app/types';
import { DashboardsTable } from '../../common/components/dashboards/dashboards_table';
import { HeaderPage } from '../../common/components/header_page';
import { useAppRootNavLink } from '../../common/components/navigation/nav_links';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { LandingImageCards } from '../components/landing_links_images';
import * as i18n from './translations';

export const DashboardsLandingPage = () => {
  const dashboardLinks = useAppRootNavLink(SecurityPageName.dashboardsLanding)?.links ?? [];

  return (
    <SecuritySolutionPageWrapper>
      <HeaderPage title={i18n.DASHBOARDS_PAGE_TITLE} />
      <EuiSpacer size="s" />

      <EuiTitle size="xxxs">
        <h2>{i18n.DASHBOARDS_PAGE_SECTION_FAVORITE}</h2>
      </EuiTitle>
      <EuiHorizontalRule margin="s" />
      <LandingImageCards items={dashboardLinks} />
      <EuiSpacer size="xxl" />

      <EuiTitle size="xxxs">
        <h2>{i18n.DASHBOARDS_PAGE_SECTION_ALL}</h2>
      </EuiTitle>
      <EuiHorizontalRule margin="s" />
      <EuiSpacer size="m" />
      <DashboardsTable />

      <SpyRoute pageName={SecurityPageName.dashboardsLanding} />
    </SecuritySolutionPageWrapper>
  );
};
