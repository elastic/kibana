/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiPanel, EuiText } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

const SpinnerFlexItem = styled(EuiFlexItem)`
  margin-right: 5px;
`;

SpinnerFlexItem.displayName = 'SpinnerFlexItem';

export interface LoadingPanelProps {
  dataTestSubj?: string;
  text: string | React.ReactNode;
  height: number | string;
  showBorder?: boolean;
  width: number | string;
  zIndex?: number | string;
  position?: string;
}

export const LoadingPanel = React.memo<LoadingPanelProps>(
  ({
    dataTestSubj = '',
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
        <EuiPanel
          data-test-subj={dataTestSubj}
          className={showBorder ? '' : 'euiPanel-loading-hide-border'}
        >
          <EuiFlexGroup alignItems="center" direction="row" gutterSize="none">
            <SpinnerFlexItem grow={false}>
              <EuiLoadingSpinner size="m" />
            </SpinnerFlexItem>

            <EuiFlexItem grow={false}>
              <EuiText>{text}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </LoadingStaticContentPanel>
    </LoadingStaticPanel>
  )
);

LoadingPanel.displayName = 'LoadingPanel';

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

LoadingStaticPanel.displayName = 'LoadingStaticPanel';

export const LoadingStaticContentPanel = styled.div`
  flex: 0 0 auto;
  align-self: center;
  text-align: center;
  height: fit-content;
  .euiPanel.euiPanel--paddingMedium {
    padding: 10px;
  }
`;

LoadingStaticContentPanel.displayName = 'LoadingStaticContentPanel';

// eslint-disable-next-line import/no-default-export
export { LoadingPanel as default };
