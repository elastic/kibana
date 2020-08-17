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
  EuiTab,
  EuiTabs,
  EuiTitle,
  EuiTitleProps,
} from '@elastic/eui';
import React, { memo, MouseEventHandler, ReactNode, useMemo } from 'react';
import styled from 'styled-components';
import { EuiTabProps } from '@elastic/eui/src/components/tabs/tab';

const StyledEuiPage = styled(EuiPage)`
  &.endpoint--isListView {
    padding: 0 ${(props) => props.theme.eui.euiSizeL};

    .endpoint-header {
      padding: ${(props) => props.theme.eui.euiSizeL};
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
  .endpoint-navTabs {
    margin-left: ${(props) => props.theme.eui.euiSizeM};
  }
  .endpoint-header-leftSection {
    overflow: hidden;
  }
`;

const isStringOrNumber = /(string|number)/;

/**
 * The `PageView` component used to render `headerLeft` when it is set as a `string`
 * Can be used when wanting to customize the `headerLeft` value but still use the standard
 * title component
 */
export const PageViewHeaderTitle = memo<Omit<EuiTitleProps, 'children'> & { children: ReactNode }>(
  ({ children, size = 'l', ...otherProps }) => {
    return (
      <EuiTitle {...otherProps} size={size}>
        <h1 data-test-subj="pageViewHeaderLeftTitle">{children}</h1>
      </EuiTitle>
    );
  }
);

PageViewHeaderTitle.displayName = 'PageViewHeaderTitle';

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
PageViewBodyHeaderTitle.displayName = 'PageViewBodyHeaderTitle';

export type PageViewProps = EuiPageProps & {
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
  /**
   * The list of tab navigation items
   */
  tabs?: Array<
    EuiTabProps & {
      name: ReactNode;
      id: string;
      href?: string;
      onClick?: MouseEventHandler<HTMLAnchorElement | HTMLButtonElement>;
    }
  >;
  children?: ReactNode;
};

/**
 * Page View layout for use in Endpoint
 */
export const PageView = memo<PageViewProps>(
  ({ viewType, children, headerLeft, headerRight, bodyHeader, tabs, ...otherProps }) => {
    const tabComponents = useMemo(() => {
      if (!tabs) {
        return [];
      }
      return tabs.map(({ name, id, ...otherEuiTabProps }) => (
        <EuiTab {...otherEuiTabProps} key={id}>
          {name}
        </EuiTab>
      ));
    }, [tabs]);

    return (
      <StyledEuiPage
        className={(viewType === 'list' && 'endpoint--isListView') || 'endpoint--isDetailsView'}
        {...otherProps}
      >
        <EuiPageBody>
          {(headerLeft || headerRight) && (
            <EuiPageHeader className="endpoint-header">
              <EuiPageHeaderSection
                className="endpoint-header-leftSection"
                data-test-subj="pageViewHeaderLeft"
              >
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
          {tabComponents.length > 0 && (
            <EuiTabs className="endpoint-navTabs">{tabComponents}</EuiTabs>
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
  }
);

PageView.displayName = 'PageView';
