/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPageBody, EuiSpacer } from '@elastic/eui';

import type { HeaderProps } from '../components';
import { Header } from '../components';

import { Page, ContentWrapper, Wrapper } from './without_header';

export interface WithHeaderLayoutProps extends HeaderProps {
  restrictWidth?: number;
  restrictHeaderWidth?: number;
  'data-test-subj'?: string;
  children?: React.ReactNode;
  isReadOnly?: boolean;
}

export const WithHeaderLayout: React.FC<WithHeaderLayoutProps> = ({
  restrictWidth,
  restrictHeaderWidth,
  children,
  'data-test-subj': dataTestSubj,
  isReadOnly,
  ...rest
}) => (
  <Wrapper>
    <Header
      maxWidth={restrictHeaderWidth}
      data-test-subj={dataTestSubj ? `${dataTestSubj}_header` : undefined}
      {...rest}
    />
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
  </Wrapper>
);
