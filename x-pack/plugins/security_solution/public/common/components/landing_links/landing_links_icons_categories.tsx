/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { euiThemeVars } from '@kbn/ui-theme';
import { css } from '@emotion/react';
import { EuiHorizontalRule, EuiSpacer, EuiTitle } from '@elastic/eui';
import type { SecurityPageName } from '../../../../common';
import type { NavigationLink } from '../../links';
import { useRootNavLink } from '../../links/nav_links';
import { SpyRoute } from '../../utils/route/spy_routes';
import { HeaderPage } from '../header_page';
import { SecuritySolutionPageWrapper } from '../page_wrapper';
import { LandingLinksIcons } from './landing_links_icons';

export interface LandingLinksIconsCategoriesPageProps {
  title: string;
  pageName: SecurityPageName;
}
type CategoriesLinks = Array<{ label?: string; links: NavigationLink[] }>;

const euiHorizontalRuleCSS = css`
  margin-top: ${euiThemeVars.euiSizeM};
  margin-bottom: ${euiThemeVars.euiSizeL};
`;

export const LandingLinksIconsCategoriesPage: React.FC<LandingLinksIconsCategoriesPageProps> =
  React.memo(function LandingLinksIconsCategoriesPage({ title, pageName }) {
    return (
      <SecuritySolutionPageWrapper>
        <HeaderPage title={title} />
        <LandingLinksIconsCategories pageName={pageName} />
        <SpyRoute pageName={pageName} />
      </SecuritySolutionPageWrapper>
    );
  });

const useCategories = ({ pageName }: { pageName: SecurityPageName }): CategoriesLinks => {
  const { links = [], categories = [] } = useRootNavLink(pageName) ?? {};
  const linksById = Object.fromEntries(links.map((link) => [link.id, link]));

  return categories.reduce<CategoriesLinks>((acc, { label, linkIds }) => {
    const linksItem = linkIds.reduce<NavigationLink[]>((linksAcc, linkId) => {
      if (linksById[linkId]) {
        linksAcc.push(linksById[linkId]);
      }
      return linksAcc;
    }, []);
    if (linksItem.length > 0) {
      acc.push({ label, links: linksItem });
    }
    return acc;
  }, []);
};

export const LandingLinksIconsCategories = React.memo(function LandingLinksIconsCategories({
  pageName,
}: {
  pageName: SecurityPageName;
}) {
  const categories = useCategories({ pageName });
  return (
    <>
      {categories.map(({ label, links }, index) => (
        <div key={`${index}_${label}`}>
          {index > 0 && (
            <>
              <EuiSpacer key="first" size="xl" />
              <EuiSpacer key="second" size="xl" />
            </>
          )}
          <EuiTitle size="xxxs">
            <h2>{label}</h2>
          </EuiTitle>
          <EuiHorizontalRule css={euiHorizontalRuleCSS} />
          <LandingLinksIcons items={links} />
        </div>
      ))}
    </>
  );
});
