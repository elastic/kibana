/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, PropsWithChildren, ReactNode, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageContent,
  EuiPageHeader,
  EuiPanel,
  EuiPanelProps,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import styled from 'styled-components';
import classnames from 'classnames';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';

const EuiPanelStyled = styled(EuiPanel)`
  &.full-height,
  .full-height {
    height: 100%;
  }

  .is-scrollable {
    overflow: auto;
  }
`;

export type PageLayoutProps = PropsWithChildren<{
  pageTitle?: ReactNode;
  pageDescription?: ReactNode;
  actions?: ReactNode;
  headerHasBottomBorder?: boolean;
  restrictWidth?: boolean | number | string;
  paddingSize?: EuiPanelProps['paddingSize'];
  scrollableBody?: boolean;
  headerBackComponent?: ReactNode;
  'data-test-subj'?: string;
}>;

export const PageLayout = memo<PageLayoutProps>(
  ({
    pageTitle,
    pageDescription,
    actions,
    headerHasBottomBorder,
    restrictWidth,
    paddingSize = 'l',
    scrollableBody = false,
    headerBackComponent,
    children,
    'data-test-subj': dataTestSubj,
  }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const hideHeader = !pageTitle && !pageDescription && !actions;

    const bodyClassname = useMemo(() => {
      return classnames({
        'eui-scrollBar is-scrollable': scrollableBody,
        'full-height': true,
      });
    }, [scrollableBody]);

    const layoutClassname = useMemo(() => {
      return classnames({
        'full-height': scrollableBody,
      });
    }, [scrollableBody]);

    const headerTitleContainer = useMemo(() => {
      return hideHeader ? null : (
        <EuiFlexGroup direction="column" gutterSize="none" alignItems="flexStart" wrap={false}>
          {headerBackComponent && <EuiFlexItem grow={false}>{headerBackComponent}</EuiFlexItem>}
          <EuiFlexItem grow={false}>
            <EuiTitle size="l">
              <span data-test-subj={getTestId('titleHolder')}>{pageTitle}</span>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }, [getTestId, headerBackComponent, hideHeader, pageTitle]);

    return (
      <EuiPanelStyled
        hasShadow={false}
        paddingSize={paddingSize}
        hasBorder={false}
        data-test-subj={dataTestSubj}
        className="full-height"
        color="transparent"
      >
        <EuiFlexGroup
          direction="column"
          wrap={false}
          responsive={false}
          gutterSize="none"
          className={layoutClassname}
        >
          {!hideHeader && (
            <EuiFlexItem grow={false}>
              <EuiPageHeader
                pageTitle={headerTitleContainer}
                description={pageDescription}
                bottomBorder={headerHasBottomBorder}
                rightSideItems={actions ? [actions] : undefined}
                restrictWidth={restrictWidth}
                data-test-subj={getTestId('header')}
              />
              <EuiSpacer size="l" />
            </EuiFlexItem>
          )}

          <EuiFlexItem grow className={bodyClassname}>
            <EuiPageContent
              hasBorder={false}
              hasShadow={false}
              paddingSize="none"
              color="transparent"
              borderRadius="none"
            >
              {children}
            </EuiPageContent>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanelStyled>
    );
  }
);
PageLayout.displayName = 'PageLayout';
