/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPage, EuiPageBody, EuiPageProps } from '@elastic/eui';
import React, { ReactNode } from 'react';
import styled from 'styled-components';
import { Header } from '../header/index';

const Page = styled(EuiPage)<EuiPageProps>`
  background: transparent;
`;

const Container = styled.div<{ color?: string }>`
  overflow-y: hidden;
  min-height: calc(
    100vh - ${(props) => props.theme.eui.euiHeaderHeight + props.theme.eui.euiHeaderHeight}
  );
  background: ${(props) => props.color};
`;

interface Props {
  datePicker?: ReactNode;
  headerColor: string;
  bodyColor: string;
  children?: ReactNode;
  restrictWidth?: number;
}

export function WithHeaderLayout({
  datePicker,
  headerColor,
  bodyColor,
  children,
  restrictWidth,
}: Props) {
  return (
    <Container color={bodyColor}>
      <Header color={headerColor} datePicker={datePicker} restrictWidth={restrictWidth} />
      <Page restrictWidth={restrictWidth}>
        <EuiPageBody>{children}</EuiPageBody>
      </Page>
    </Container>
  );
}
