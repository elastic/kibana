/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import styled from 'styled-components';
import { EuiPage, EuiPageBody, EuiSpacer } from '@elastic/eui';
import { Header, HeaderProps } from '../components';

const Page = styled(EuiPage)`
  background: ${props => props.theme.eui.euiColorEmptyShade};
`;

interface Props extends HeaderProps {
  restrictWidth?: number;
  restrictHeaderWidth?: number;
  children?: React.ReactNode;
}

export const WithHeaderLayout: React.FC<Props> = ({
  restrictWidth,
  restrictHeaderWidth,
  children,
  ...rest
}) => (
  <Fragment>
    <Header maxWidth={restrictHeaderWidth} {...rest} />
    <Page restrictWidth={restrictWidth || 1200}>
      <EuiPageBody>
        <EuiSpacer size="m" />
        {children}
      </EuiPageBody>
    </Page>
  </Fragment>
);
