/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLoadingChart, EuiPanel, EuiText } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled, { injectGlobal } from 'styled-components';

// SIDE EFFECT: the following `injectGlobal` overrides default styling in angular code that was not theme-friendly
// tslint:disable-next-line:no-unused-expression
injectGlobal`
  .euiPanel-loading-hide-border {
    border: none;
  }
`;

interface LoadingProps {
  text: string;
  height: number | string;
  showBorder?: boolean;
  width: number | string;
  zIndex?: number | string;
  position?: string;
}

export const LoadingPanel = pure<LoadingProps>(
  ({
    height = 'auto',
    showBorder = true,
    text,
    width,
    position = 'relative',
    zIndex = 'inherit',
  }) => (
    <LoadingStaticPanel
      className="app-loading"
      height={height}
      width={width}
      position={position}
      zIndex={zIndex}
    >
      <LoadingStaticContentPanel>
        <EuiPanel className={showBorder ? '' : 'euiPanel-loading-hide-border'}>
          <EuiLoadingChart size="m" />
          <EuiText>
            <p>{text}</p>
          </EuiText>
        </EuiPanel>
      </LoadingStaticContentPanel>
    </LoadingStaticPanel>
  )
);

export const LoadingStaticPanel = styled.div<{
  height: number | string;
  position: string;
  width: number | string;
  zIndex: number | string;
}>`
  height: ${({ height }) => height};
  position: ${({ position }) => position};
  width: ${({ width }) => width};
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
  z-index: ${({ zIndex }) => zIndex};
`;

export const LoadingStaticContentPanel = styled.div`
  flex: 0 0 auto;
  align-self: center;
  text-align: center;
  height: fit-content;
  .euiPanel.euiPanel--paddingMedium {
    padding: 10px;
  }
`;
