/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel } from '@elastic/eui';
import React, { FC } from 'react';
import styled from 'styled-components';

const ResponsiveWrapper = styled.div`
  margin-left: 120px;
  @media (max-width: 950px) {
    margin-left: 48px;
  }
  @media (max-width: 767px) {
    margin-left: 12px;
    margin-top: 40px;
  }
`;

export interface ResponsiveWrapperProps {
  isResponsive: boolean;
}

/**
 * HOC that wraps a component in either a responsive div or an EuiPanel.
 * @param Component The component to wrap.
 */
export const withResponsiveWrapper = <P extends {} & ResponsiveWrapperProps>(
  Component: FC<P>
): FC<ResponsiveWrapperProps & P> => ({ isResponsive, ...rest }: ResponsiveWrapperProps) =>
  isResponsive ? (
    <ResponsiveWrapper>
      <Component {...(rest as P)} />
    </ResponsiveWrapper>
  ) : (
    <EuiPanel paddingSize="m">
      <Component {...(rest as P)} />
    </EuiPanel>
  );
