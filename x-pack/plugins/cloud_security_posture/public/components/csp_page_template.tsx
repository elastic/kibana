/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { NavLink } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { EuiErrorBoundary } from '@elastic/eui';
import { KibanaPageTemplate, type KibanaPageTemplateProps } from '@kbn/shared-ux-components';
import { allNavigationItems } from '../common/navigation/constants';
import type { CspNavigationItem } from '../common/navigation/types';

const activeItemStyle = { fontWeight: 700 };

export const getSideNavItems = (
  navigationItems: Record<string, CspNavigationItem>
): NonNullable<NonNullable<KibanaPageTemplateProps['solutionNav']>['items']> =>
  Object.entries(navigationItems)
    .filter(([_, navigationItem]) => !navigationItem.disabled)
    .map(([id, navigationItem]) => ({
      id,
      name: navigationItem.name,
      renderItem: () => (
        <NavLink to={navigationItem.path} activeStyle={activeItemStyle}>
          {navigationItem.name}
        </NavLink>
      ),
    }));

const DEFAULT_PAGE_PROPS: KibanaPageTemplateProps = {
  solutionNav: {
    name: i18n.translate('xpack.csp.cspPageTemplate.navigationTitle', {
      defaultMessage: 'Cloud Security Posture',
    }),
    items: getSideNavItems({
      dashboard: allNavigationItems.dashboard,
      findings: allNavigationItems.findings,
      benchmark: allNavigationItems.benchmarks,
    }),
  },
  restrictWidth: false,
};

export const CspPageTemplate = <TData, TError>({
  children,
  ...kibanaPageTemplateProps
}: KibanaPageTemplateProps) => {
  return (
    <KibanaPageTemplate {...DEFAULT_PAGE_PROPS} {...kibanaPageTemplateProps}>
      <EuiErrorBoundary>{children}</EuiErrorBoundary>
    </KibanaPageTemplate>
  );
};
