/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { EuiHorizontalRule, EuiSpacer, EuiTitle } from '@elastic/eui';

import { SecurityPageName } from '../../app/types';
import { HeaderPage } from '../../common/components/header_page';
import { useRootNavLink } from '../../common/links/nav_links';
import type { NavigationLink } from '../../common/links';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { LandingLinksIcons } from '../../common/components/landing_links/landing_links_icons';

const MANAGE_PAGE_TITLE = i18n.translate('xpack.securitySolution.management.landing.pageTitle', {
  defaultMessage: 'Manage',
});

export const ManageLandingPage = () => (
  <SecuritySolutionPageWrapper>
    <HeaderPage title={MANAGE_PAGE_TITLE} />
    <ManagementCategories />
    <SpyRoute pageName={SecurityPageName.administration} />
  </SecuritySolutionPageWrapper>
);

const StyledEuiHorizontalRule = styled(EuiHorizontalRule)`
  margin-top: ${({ theme }) => theme.eui.euiSizeM};
  margin-bottom: ${({ theme }) => theme.eui.euiSizeL};
`;

type ManagementCategories = Array<{ label: string; links: NavigationLink[] }>;
const useManagementCategories = (): ManagementCategories => {
  const { links = [], categories = [] } = useRootNavLink(SecurityPageName.administration) ?? {};

  const manageLinksById = Object.fromEntries(links.map((link) => [link.id, link]));

  return categories.reduce<ManagementCategories>((acc, { label, linkIds }) => {
    const linksItem = linkIds.reduce<NavigationLink[]>((linksAcc, linkId) => {
      if (manageLinksById[linkId]) {
        linksAcc.push(manageLinksById[linkId]);
      }
      return linksAcc;
    }, []);
    if (linksItem.length > 0) {
      acc.push({ label, links: linksItem });
    }
    return acc;
  }, []);
};

export const ManagementCategories = () => {
  const managementCategories = useManagementCategories();

  return (
    <>
      {managementCategories.map(({ label, links }, index) => (
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
          <LandingLinksIcons items={links} />
        </div>
      ))}
    </>
  );
};

ManagementCategories.displayName = 'ManagementCategories';
