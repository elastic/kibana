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
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';
import { SecurityPageName } from '../../../common/constants';
import { SpyRoute } from '../../common/utils/route/spy_routes';

interface AdministrationListPageProps {
  title: React.ReactNode;
  subtitle: React.ReactNode;
  actions?: React.ReactNode;
  headerBackComponent?: React.ReactNode;
}

export const AdministrationListPage: FC<AdministrationListPageProps & CommonProps> = memo(
  ({ title, subtitle, actions, children, headerBackComponent, ...otherProps }) => {
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
      return <span data-test-subj="header-panel-subtitle">{subtitle}</span>;
    }, [subtitle]);

    return (
      <>
        <EuiPageHeader
          pageTitle={header}
          description={description}
          bottomBorder={true}
          rightSideItems={[actions]}
          restrictWidth={false}
          {...otherProps}
        />
        <EuiSpacer size="l" />
        {children}

        <SpyRoute pageName={SecurityPageName.administration} />
      </>
    );
  }
);

AdministrationListPage.displayName = 'AdministrationListPage';
