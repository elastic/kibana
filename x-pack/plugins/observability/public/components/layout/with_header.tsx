/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiPage, EuiPageBody, EuiSpacer, EuiPageProps } from '@elastic/eui';
import { Header } from '../header/index';

const Page = styled(EuiPage)<EuiPageProps & { color: string }>`
  background: ${(props) => props.color};
`;

interface Props {
  headerColor: string;
  bodyColor: string;
  children?: React.ReactNode;
}

export const WithHeaderLayout = ({ headerColor, bodyColor, children }: Props) => (
  <>
    <Header color={headerColor} />
    <Page color={bodyColor} restrictWidth={1200}>
      <EuiPageBody>
        <EuiSpacer size="m" />
        {children}
      </EuiPageBody>
    </Page>
  </>
);
