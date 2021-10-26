/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, memo, useMemo } from 'react';
import {
  CommonProps,
  EuiPageHeader,
  EuiPageContent,
  EuiPageContentBody,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';
import { SecurityPageName } from '../../../common/constants';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { useTestIdGenerator } from './hooks/use_test_id_generator';

interface AdministrationListPageProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  restrictWidth?: boolean | number;
  hasBottomBorder?: boolean;
  hideHeader?: boolean;
  headerBackComponent?: React.ReactNode;
}

export const AdministrationListPage: FC<AdministrationListPageProps & CommonProps> = memo(
  ({
    title,
    subtitle,
    actions,
    children,
    restrictWidth = false,
    hasBottomBorder = true,
    hideHeader = false,
    headerBackComponent,
    ...otherProps
  }) => {
    const header = useMemo(() => {
      return (
        <EuiFlexGroup direction="column" gutterSize="none" alignItems="flexStart">
          <EuiFlexItem grow={false}>
            {headerBackComponent && <>{headerBackComponent}</>}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTitle size="l">
              <span data-test-subj="header-page-title">{title}</span>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }, [headerBackComponent, title]);

    const description = useMemo(() => {
      return subtitle ? <span data-test-subj="header-panel-subtitle">{subtitle}</span> : undefined;
    }, [subtitle]);

    const getTestId = useTestIdGenerator(otherProps['data-test-subj']);

    return (
      <div {...otherProps}>
        {!hideHeader && (
          <>
            <EuiPageHeader
              pageTitle={header}
              description={description}
              bottomBorder={hasBottomBorder}
              rightSideItems={actions ? [actions] : undefined}
              restrictWidth={restrictWidth}
              data-test-subj={getTestId('header')}
            />
            <EuiSpacer size="l" />
          </>
        )}

        <EuiPageContent
          hasBorder={false}
          hasShadow={false}
          paddingSize="none"
          color="transparent"
          borderRadius="none"
        >
          <EuiPageContentBody restrictWidth={restrictWidth}>{children}</EuiPageContentBody>
        </EuiPageContent>

        <SpyRoute pageName={SecurityPageName.administration} />
      </div>
    );
  }
);

AdministrationListPage.displayName = 'AdministrationListPage';
