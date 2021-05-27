/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import styled from 'styled-components';
import { EuiPage, EuiPageBody, EuiSpacer } from '@elastic/eui';

export const Page = styled(EuiPage)`
  background: ${(props) => props.theme.eui.euiColorEmptyShade};
  width: 100%;
  align-self: center;
  margin: auto;
  flex: 1;
`;

export const ContentWrapper = styled.div`
  height: 100%;
`;

interface Props {
  restrictWidth?: number;
  children?: React.ReactNode;
}

export const WithoutHeaderLayout: React.FC<Props> = ({ restrictWidth, children }) => (
  <Fragment>
    <Page restrictWidth={restrictWidth || 1200}>
      <EuiPageBody>
        <ContentWrapper>
          <EuiSpacer size="m" />
          {children}
        </ContentWrapper>
      </EuiPageBody>
    </Page>
  </Fragment>
);
