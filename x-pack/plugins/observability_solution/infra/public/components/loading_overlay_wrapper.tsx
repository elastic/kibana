/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner, useEuiTheme } from '@elastic/eui';
import { transparentize } from 'polished';
import React, { FC, PropsWithChildren } from 'react';
import { euiStyled } from '@kbn/kibana-react-plugin/common';

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

const RelativeDiv = euiStyled.div`
  position: relative;
`;

const OverlayDiv = euiStyled.div`
  align-items: center;
  background-color: ${() => {
    const { euiTheme } = useEuiTheme();
    return transparentize(0.3, euiTheme.colors.emptyShade);
  }};
  display: flex;
  height: 100%;
  justify-content: center;
  left: 0;
  position: absolute;
  top: 0;
  width: 100%;
  z-index: ${(props) => props.theme.eui.euiZLevel1};
`;
