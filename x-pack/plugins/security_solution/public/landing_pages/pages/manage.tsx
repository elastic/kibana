/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiHorizontalRule, EuiSpacer, EuiTitle } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { SecurityPageName } from '../../app/types';
import { HeaderPage } from '../../common/components/header_page';
import { useAppRootNavLink } from '../../common/components/navigation/nav_links';
import { NavigationCategories } from '../../common/components/navigation/types';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { navigationCategories } from '../../management/links';
import { LandingLinksIcons } from '../components/landing_links_icons';
import { MANAGE_PAGE_TITLE } from './translations';

export const ManageLandingPage = () => (
  <SecuritySolutionPageWrapper>
    <HeaderPage title={MANAGE_PAGE_TITLE} />
    <LandingCategories categories={navigationCategories} />
    <SpyRoute pageName={SecurityPageName.dashboardsLanding} />
  </SecuritySolutionPageWrapper>
);

const StyledEuiHorizontalRule = styled(EuiHorizontalRule)`
  margin-top: ${({ theme }) => theme.eui.paddingSizes.m};
  margin-bottom: ${({ theme }) => theme.eui.paddingSizes.l};
`;

const useGetManageNavLinks = () => {
  const manageNavLinks = useAppRootNavLink(SecurityPageName.administration)?.links ?? [];

  const manageLinksById = Object.fromEntries(manageNavLinks.map((link) => [link.id, link]));
  return (linkIds: readonly SecurityPageName[]) => linkIds.map((linkId) => manageLinksById[linkId]);
};

export const LandingCategories = React.memo(
  ({ categories }: { categories: NavigationCategories }) => {
    const getManageNavLinks = useGetManageNavLinks();

    return (
      <>
        {categories.map(({ label, linkIds }, index) => (
          <div key={label}>
            {index > 0 && (
              <>
                <EuiSpacer key="first" size="xl" />
                <EuiSpacer key="second" size="xl" />
              </>
            )}
            <EuiTitle size="xxxs">
              <h2>{label}</h2>
            </EuiTitle>
            <StyledEuiHorizontalRule />
            <LandingLinksIcons items={getManageNavLinks(linkIds)} />
          </div>
        ))}
      </>
    );
  }
);

LandingCategories.displayName = 'LandingCategories';
