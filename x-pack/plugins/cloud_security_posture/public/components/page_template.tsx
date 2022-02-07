/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import { NavLink } from 'react-router-dom';
import { EuiErrorBoundary } from '@elastic/eui';
import {
  KibanaPageTemplate,
  KibanaPageTemplateProps,
} from '../../../../../src/plugins/kibana_react/public';
import { allNavigationItems } from '../common/navigation/constants';
import type { CspNavigationItem } from '../common/navigation/types';
import { CLOUD_SECURITY_POSTURE } from '../common/translations';
import { CspLoadingState } from './csp_loading_state';
import { LOADING } from './translations';

const activeItemStyle = { fontWeight: 700 };

export const getSideNavItems = (
  navigationItems: Record<string, CspNavigationItem>
): NonNullable<KibanaPageTemplateProps['solutionNav']>['items'] =>
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

const defaultProps: KibanaPageTemplateProps = {
  solutionNav: {
    name: CLOUD_SECURITY_POSTURE,
    items: getSideNavItems(allNavigationItems),
  },
  restrictWidth: false,
  template: 'default',
};

interface CspPageTemplateProps extends KibanaPageTemplateProps {
  isLoading?: boolean;
  loadingText?: string;
}

export const CspPageTemplate: React.FC<CspPageTemplateProps> = ({
  children,
  isLoading,
  loadingText = LOADING,
  ...props
}) => {
  return (
    <KibanaPageTemplate {...defaultProps} {...props}>
      <EuiErrorBoundary>
        {isLoading ? (
          <>
            <EuiSpacer size="xxl" />
            <CspLoadingState>{loadingText}</CspLoadingState>
          </>
        ) : (
          children
        )}
      </EuiErrorBoundary>
    </KibanaPageTemplate>
  );
};
