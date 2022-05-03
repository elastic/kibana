/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { SecurityPageName } from '../../app/types';
import { HeaderPage } from '../../common/components/header_page';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { LandingLinksImages, NavItem } from '../components/landing_links_images';
import { DASHBOARDS_PAGE_TITLE } from './translations';
import overviewPageImg from '../../common/images/overview_page.png';
import { OVERVIEW } from '../../app/translations';

const items: NavItem[] = [
  {
    id: SecurityPageName.overview,
    label: OVERVIEW,
    description: i18n.translate('xpack.securitySolution.landing.dashboards.overviewDescription', {
      defaultMessage: 'What is going in your secuity environment',
    }),
    image: overviewPageImg,
  },
];

export const DashboardsLandingPage = () => (
  <SecuritySolutionPageWrapper>
    <HeaderPage title={DASHBOARDS_PAGE_TITLE} />
    <LandingLinksImages items={items} />
    <SpyRoute pageName={SecurityPageName.dashboardsLanding} />
  </SecuritySolutionPageWrapper>
);
