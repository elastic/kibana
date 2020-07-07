/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPage, EuiPageBody, EuiPageProps } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { Header } from '../header/index';

const getPaddingSize = (props: EuiPageProps) => (props.restrictWidth ? 0 : '24px');

const Page = styled(EuiPage)<EuiPageProps>`
  background: transparent;
  padding-right: ${getPaddingSize};
  padding-left: ${getPaddingSize};
`;

const Container = styled.div<{ color?: string }>`
  overflow-y: hidden;
  min-height: calc(100vh - ${(props) => props.theme.eui.euiHeaderChildSize});
  background: ${(props) => props.color};
`;

interface Props {
  headerColor: string;
  bodyColor: string;
  children?: React.ReactNode;
  restrictWidth?: number;
  showAddData?: boolean;
  showGiveFeedback?: boolean;
}

export const WithHeaderLayout = ({
  headerColor,
  bodyColor,
  children,
  restrictWidth,
  showAddData,
  showGiveFeedback,
}: Props) => (
  <Container color={bodyColor}>
    <Header
      color={headerColor}
      restrictWidth={restrictWidth}
      showAddData={showAddData}
      showGiveFeedback={showGiveFeedback}
    />
    <Page restrictWidth={restrictWidth}>
      <EuiPageBody>{children}</EuiPageBody>
    </Page>
  </Container>
);
