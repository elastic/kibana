/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageHeader, EuiPageHeaderSection, EuiSpacer, EuiText } from '@elastic/eui';
import React, { FC } from 'react';

export interface LayoutProps {
  pageTitle?: string;
  border?: boolean;
}

export const displayName = 'DefaultPageLayout';

export const DefaultPageLayout: FC<LayoutProps> = ({ children, pageTitle, border = true }) => {
  return (
    <>
      <EuiPageHeader alignItems="center" bottomBorder={border}>
        <EuiPageHeaderSection>
          {pageTitle && (
            <EuiText>
              <h2 data-testid={`${displayName}-subheader`}>{pageTitle}</h2>
            </EuiText>
          )}
        </EuiPageHeaderSection>
      </EuiPageHeader>
      <EuiSpacer size="l" />
      {children}
    </>
  );
};

DefaultPageLayout.displayName = displayName;
