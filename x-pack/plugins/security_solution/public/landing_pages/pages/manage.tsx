/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiHorizontalRule, EuiSpacer, EuiTitle } from '@elastic/eui';
import { compact } from 'lodash/fp';
import React from 'react';
import styled from 'styled-components';

import { SecurityPageName } from '../../app/types';
import { HeaderPage } from '../../common/components/header_page';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { useAppNavLink } from '../../common/links';
import { NavLinkItem } from '../../common/links/types';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { LandingLinksIcons } from '../components/landing_links_icons';
import { LandingNavGroup, MANAGE_NAVIGATION_CATEGORIES } from '../constants';
import { MANAGE_PAGE_TITLE } from './translations';

export const ManageLandingPage = () => (
  <SecuritySolutionPageWrapper>
    <HeaderPage title={MANAGE_PAGE_TITLE} />
    <LandingCategories groups={MANAGE_NAVIGATION_CATEGORIES} />
    <SpyRoute pageName={SecurityPageName.dashboardsLanding} />
  </SecuritySolutionPageWrapper>
);

const StyledEuiHorizontalRule = styled(EuiHorizontalRule)`
  margin-top: ${({ theme }) => theme.eui.paddingSizes.m};
  margin-bottom: ${({ theme }) => theme.eui.paddingSizes.l};
`;

const getNavItembyId = (links: NavLinkItem[]) => (itemId: string) =>
  links.find(({ id }: NavLinkItem) => id === itemId);

const navItemsFromIds = (itemIds: SecurityPageName[], links: NavLinkItem[]) =>
  compact(itemIds.map(getNavItembyId(links)));

export const LandingCategories = React.memo(({ groups }: { groups: LandingNavGroup[] }) => {
  const manageLink = useAppNavLink(SecurityPageName.administration);

  return (
    <>
      {groups.map(({ label, itemIds }, index) => (
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
          <LandingLinksIcons items={navItemsFromIds(itemIds, manageLink?.links ?? [])} />
        </div>
      ))}
    </>
  );
});

LandingCategories.displayName = 'LandingCategories';
