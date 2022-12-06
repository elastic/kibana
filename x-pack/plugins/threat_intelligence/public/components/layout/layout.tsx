/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageHeader, EuiPageHeaderSection, EuiSpacer, EuiText } from '@elastic/eui';
import React, { FC, ReactNode } from 'react';
import { SecuritySolutionPageWrapper } from '../../containers/security_solution_page_wrapper';

export interface LayoutProps {
  pageTitle?: string;
  border?: boolean;
  subHeader?: ReactNode;
}

export const TITLE_TEST_ID = 'tiDefaultPageLayoutTitle';

export const DefaultPageLayout: FC<LayoutProps> = ({
  children,
  pageTitle,
  border = true,
  subHeader,
}) => {
  return (
    <SecuritySolutionPageWrapper>
      <EuiPageHeader alignItems="center" bottomBorder={border}>
        <EuiPageHeaderSection>
          {pageTitle && (
            <EuiText>
              <h2 data-test-subj={TITLE_TEST_ID}>{pageTitle}</h2>
            </EuiText>
          )}
          {subHeader ? (
            <>
              <EuiSpacer size="m" />
              {subHeader}
            </>
          ) : null}
        </EuiPageHeaderSection>
      </EuiPageHeader>
      <EuiSpacer size="l" />
      {children}
    </SecuritySolutionPageWrapper>
  );
};
