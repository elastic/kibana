/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiPage, EuiPageBody, EuiSpacer, EuiPageProps } from '@elastic/eui';
import { Header } from '../header/index';

const Page = styled(EuiPage)<EuiPageProps>`
  background: transparent;
`;

const Container = styled.div<{ color?: string }>`
  min-height: calc(100vh - ${(props) => props.theme.eui.euiHeaderChildSize});
  background: ${(props) => props.color};
`;

interface Props {
  headerColor: string;
  bodyColor: string;
  children?: React.ReactNode;
  restrictWidth?: number;
}

export const WithHeaderLayout = ({ headerColor, bodyColor, children, restrictWidth }: Props) => (
  <Container color={bodyColor}>
    <Header color={headerColor} restrictWidth={restrictWidth} />
    <Page restrictWidth={restrictWidth}>
      <EuiPageBody>
        <EuiSpacer size="m" />
        {children}
      </EuiPageBody>
    </Page>
  </Container>
);
