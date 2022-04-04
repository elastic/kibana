/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { EuiPageBody, EuiSpacer } from '@elastic/eui';

import { Header, HeaderProps } from './header';
import { Page, ContentWrapper } from './without_header';

export interface WithHeaderLayoutProps extends HeaderProps {
  restrictWidth?: number;
  restrictHeaderWidth?: number;
  'data-test-subj'?: string;
  children?: React.ReactNode;
  headerChildren?: React.ReactNode;
}

export const WithHeaderLayout: React.FC<WithHeaderLayoutProps> = ({
  restrictWidth,
  restrictHeaderWidth,
  children,
  headerChildren,
  'data-test-subj': dataTestSubj,
  ...rest
}) => (
  <Fragment>
    <Header
      maxWidth={restrictHeaderWidth}
      data-test-subj={dataTestSubj ? `${dataTestSubj}_header` : undefined}
      {...rest}
    >
      {headerChildren}
    </Header>
    <Page
      restrictWidth={restrictWidth || 1200}
      data-test-subj={dataTestSubj ? `${dataTestSubj}_page` : undefined}
    >
      <EuiPageBody>
        <ContentWrapper>
          <EuiSpacer size="m" />
          {children}
        </ContentWrapper>
      </EuiPageBody>
    </Page>
  </Fragment>
);
