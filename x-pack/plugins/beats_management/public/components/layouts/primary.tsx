/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';

import { EuiPage, EuiPageBody, EuiPageContent, EuiPageContentBody, EuiTitle } from '@elastic/eui';

interface PrimaryLayoutProps {
  title: string;
  actionSection: React.ReactNode;
}

const HeaderContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 24px 24px 0;
  margin-bottom: 16px;
`;

export const PrimaryLayout: React.SFC<PrimaryLayoutProps> = ({
  actionSection,
  title,
  children,
}) => (
  <EuiPage>
    <EuiPageBody>
      <EuiPageContent>
        <HeaderContainer>
          <EuiTitle>
            <h1>{title}</h1>
          </EuiTitle>
          {actionSection}
        </HeaderContainer>
        <EuiPageContentBody>{children}</EuiPageContentBody>
      </EuiPageContent>
    </EuiPageBody>
  </EuiPage>
);
