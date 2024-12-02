/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import { transparentize } from 'polished';
import React, { FC, PropsWithChildren } from 'react';
import styled from '@emotion/styled';

export const LoadingOverlayWrapper: React.FC<
  React.HTMLAttributes<HTMLDivElement> & {
    isLoading: boolean;
    loadingChildren?: React.ReactNode;
  }
> = ({ children, isLoading, loadingChildren, ...rest }) => {
  return (
    <RelativeDiv {...rest}>
      {children}
      {isLoading ? <Overlay>{loadingChildren}</Overlay> : null}
    </RelativeDiv>
  );
};

const Overlay: FC<PropsWithChildren<unknown>> = ({ children }) => (
  <OverlayDiv>{children ? children : <EuiLoadingSpinner size="xl" />}</OverlayDiv>
);

const RelativeDiv = styled.div`
  position: relative;
`;

const OverlayDiv = styled.div`
  align-items: center;
  background-color: ${(props) => transparentize(0.3, props.theme.euiTheme.colors.emptyShade)};
  display: flex;
  height: 100%;
  justify-content: center;
  left: 0;
  position: absolute;
  top: 0;
  width: 100%;
  z-index: ${(props) => props.theme.euiTheme.euiZLevel1};
`;
