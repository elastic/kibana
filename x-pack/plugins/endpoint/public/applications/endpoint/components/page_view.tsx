/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
} from '@elastic/eui';
import React, { memo, ReactChild, ReactNode } from 'react';
import styled from 'styled-components';

const StyledEuiPage = styled(EuiPage)`
  padding: 0;

  .endpoint-header {
    padding: ${props => props.theme.eui.euiSizeL};
  }
  .endpoint-page-content {
    border-left: none;
    border-right: none;
  }
`;

const isStringOrNumber = /(string|number)/;

/**
 * Page View layout for use in Endpoint
 */
export const PageView = memo<{
  headerLeft?: ReactNode;
  headerRight?: ReactNode;
  bodyTitle?: ReactNode;
  children?: ReactNode;
}>(({ children, headerLeft, headerRight, bodyTitle }) => {
  return (
    <StyledEuiPage>
      <EuiPageBody>
        {(headerLeft || headerRight) && (
          <EuiPageHeader className="endpoint-header">
            <EuiPageHeaderSection>
              {isStringOrNumber.test(typeof headerLeft) ? (
                <EuiTitle size="l" data-test-subj="pageViewHeaderLeft">
                  <h1>{headerLeft}</h1>
                </EuiTitle>
              ) : (
                headerLeft
              )}
            </EuiPageHeaderSection>
            {headerRight && (
              <EuiPageHeaderSection data-test-subj="pageViewHeaderRight">
                {headerRight}
              </EuiPageHeaderSection>
            )}
          </EuiPageHeader>
        )}
        <EuiPageContent className="endpoint-page-content">
          {bodyTitle && (
            <EuiPageContentHeader>
              <EuiPageContentHeaderSection>
                {isStringOrNumber.test(typeof headerLeft) ? (
                  <EuiTitle size="l" data-test-subj="pageViewBodyTitle">
                    <h2>{bodyTitle}</h2>
                  </EuiTitle>
                ) : (
                  { bodyTitle }
                )}
              </EuiPageContentHeaderSection>
            </EuiPageContentHeader>
          )}
          <EuiPageContentBody>{children}</EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </StyledEuiPage>
  );
});
