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
  EuiPageProps,
  EuiTitle,
} from '@elastic/eui';
import React, { memo, ReactNode } from 'react';
import styled from 'styled-components';

const StyledEuiPage = styled(EuiPage)`
  padding: 0;

  .endpoint-header {
    padding: ${props => props.theme.eui.euiSizeL};
    margin-bottom: 0;
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
export const PageView = memo<
  EuiPageProps & {
    /**
     * content to be placed on the left side of the header. If a `string` is used, then it will
     * be wrapped with `<EuiTitle><h1></h1></EuiTitle>`, else it will just be used as is.
     */
    headerLeft?: ReactNode;
    /** Content for the right side of the header */
    headerRight?: ReactNode;
    /**
     *  body (sub-)header section. If a `string` is used, then it will be wrapped with
     *  `<EuiTitle><h2></h2></EuiTitle>`
     */
    bodyHeader?: ReactNode;
    children?: ReactNode;
  }
>(({ children, headerLeft, headerRight, bodyHeader, ...otherProps }) => {
  return (
    <StyledEuiPage {...otherProps}>
      <EuiPageBody>
        {(headerLeft || headerRight) && (
          <EuiPageHeader className="endpoint-header">
            <EuiPageHeaderSection data-test-subj="pageViewHeaderLeft">
              {isStringOrNumber.test(typeof headerLeft) ? (
                <EuiTitle size="l">
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
          {bodyHeader && (
            <EuiPageContentHeader>
              <EuiPageContentHeaderSection data-test-subj="pageViewBodyTitle">
                {isStringOrNumber.test(typeof bodyHeader) ? (
                  <EuiTitle>
                    <h2>{bodyHeader}</h2>
                  </EuiTitle>
                ) : (
                  bodyHeader
                )}
              </EuiPageContentHeaderSection>
            </EuiPageContentHeader>
          )}
          <EuiPageContentBody data-test-subj="pageViewBodyContent">{children}</EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </StyledEuiPage>
  );
});
