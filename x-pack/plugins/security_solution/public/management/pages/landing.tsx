/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { LandingLinksIconsCategories } from '@kbn/security-solution-navigation/landing_links';

import { SecurityPageName } from '../../app/types';
import { HeaderPage } from '../../common/components/header_page';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { useRootNavLink } from '../../common/links/nav_links';
import { useGlobalQueryString } from '../../common/utils/global_query_string';
import { trackLandingLinkClick } from '../../common/lib/telemetry/trackers';

const PAGE_TITLE = i18n.translate('xpack.securitySolution.management.landing.title', {
  defaultMessage: 'Manage',
});

export const ManageLandingPage = () => {
  const { links = [], categories = [] } = useRootNavLink(SecurityPageName.administration) ?? {};
  const urlState = useGlobalQueryString();

  return (
    <SecuritySolutionPageWrapper>
      <HeaderPage title={PAGE_TITLE} />
      <LandingLinksIconsCategories
        links={links}
        categories={categories}
        onLinkClick={trackLandingLinkClick}
        urlState={urlState}
      />
      <SpyRoute pageName={SecurityPageName.administration} />
    </SecuritySolutionPageWrapper>
  );
};
