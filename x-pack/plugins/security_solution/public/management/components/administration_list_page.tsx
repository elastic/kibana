/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, memo, useMemo } from 'react';
import { CommonProps, EuiPageTemplate, EuiTitle } from '@elastic/eui';
import { SecurityPageName } from '../../../common/constants';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { BETA_BADGE_LABEL } from '../common/translations';

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
        <>
          {headerBackComponent && <>{headerBackComponent}</>}
          <EuiTitle size="l">
            <h1 data-test-subj="header-page-title">
              <>{title}</>
            </h1>
          </EuiTitle>
        </>
      );
    }, [headerBackComponent, title]);

    return (
      <EuiPageTemplate
        pageHeader={{
          pageTitle: header,
          description: subtitle,
          children: actions,
          bottomBorder: true,
        }}
        restrictWidth={false}
      >
        {children}

        <SpyRoute pageName={SecurityPageName.administration} />
      </EuiPageTemplate>
    );
  }
);

AdministrationListPage.displayName = 'AdministrationListPage';
