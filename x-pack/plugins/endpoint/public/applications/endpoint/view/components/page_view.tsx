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
  &.endpoint--isListView {
    padding: 0;

    .endpoint-header {
      padding: ${props => props.theme.eui.euiSizeL};
      margin-bottom: 0;
    }
    .endpoint-page-content {
      border-left: none;
      border-right: none;
    }
  }
  &.endpoint--isDetailsView {
    .endpoint-page-content {
      padding: 0;
      border: none;
      background: none;
    }
  }
`;

const isStringOrNumber = /(string|number)/;

/**
 * The `PageView` component used to render `headerLeft` when it is set as a `string`
 * Can be used when wanting to customize the `headerLeft` value but still use the standard
 * title component
 */
export const PageViewHeaderTitle = memo<{ children: ReactNode }>(({ children }) => {
  return (
    <EuiTitle size="l">
      <h1 data-test-subj="pageViewHeaderLeftTitle">{children}</h1>
    </EuiTitle>
  );
});

/**
 * The `PageView` component used to render `bodyHeader` when it is set as a `string`
 * Can be used when wanting to customize the `bodyHeader` value but still use the standard
 * title component
 */
export const PageViewBodyHeaderTitle = memo<{ children: ReactNode }>(
  ({ children, ...otherProps }) => {
    return (
      <EuiTitle {...otherProps}>
        <h2 data-test-subj="pageViewBodyTitle">{children}</h2>
      </EuiTitle>
    );
  }
);

/**
 * Page View layout for use in Endpoint
 */
export const PageView = memo<
  EuiPageProps & {
    /**
     * The type of view
     */
    viewType: 'list' | 'details';
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
>(({ viewType, children, headerLeft, headerRight, bodyHeader, ...otherProps }) => {
  return (
    <StyledEuiPage
      className={(viewType === 'list' && 'endpoint--isListView') || 'endpoint--isDetailsView'}
      {...otherProps}
    >
      <EuiPageBody>
        {(headerLeft || headerRight) && (
          <EuiPageHeader className="endpoint-header">
            <EuiPageHeaderSection data-test-subj="pageViewHeaderLeft">
              {isStringOrNumber.test(typeof headerLeft) ? (
                <PageViewHeaderTitle>{headerLeft}</PageViewHeaderTitle>
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
              <EuiPageContentHeaderSection data-test-subj="pageViewBodyTitleArea">
                {isStringOrNumber.test(typeof bodyHeader) ? (
                  <PageViewBodyHeaderTitle>{bodyHeader}</PageViewBodyHeaderTitle>
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
