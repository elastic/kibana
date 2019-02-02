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
}

export const LoadingPanel = pure<LoadingProps>(
  ({ height = 'auto', showBorder = true, text, width }) => (
    <InfraLoadingStaticPanel style={{ height, width }}>
      <InfraLoadingStaticContentPanel>
        <EuiPanel className={showBorder ? '' : 'euiPanel-loading-hide-border'}>
          <EuiLoadingChart size="m" />
          <EuiText>
            <p>{text}</p>
          </EuiText>
        </EuiPanel>
      </InfraLoadingStaticContentPanel>
    </InfraLoadingStaticPanel>
  )
);

export const InfraLoadingStaticPanel = styled.div`
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

export const InfraLoadingStaticContentPanel = styled.div`
  flex: 0 0 auto;
  align-self: center;
  text-align: center;
  height: fit-content;
  .euiPanel.euiPanel--paddingMedium {
    padding: 10px;
  }
`;
