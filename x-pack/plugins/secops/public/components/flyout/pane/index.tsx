/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiFlyout, EuiFlyoutBody, EuiFlyoutHeader, EuiToolTip } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { FlyoutHeader } from '../header';
import { ResizeHandle } from '../resize_handle';

interface FlyoutPaneProps {
  children: React.ReactNode;
  flyoutHeight: number;
  headerHeight: number;
  onClose: () => void;
  timelineId: string;
  width: number;
}

/** SIDE EFFECT: This container has selectors that override EUI flyout styles  */
const EuiFlyoutContainer = styled.div<{ headerHeight: number; width: number }>`
  & > span > div {
    .euiFlyout {
      min-width: 150px !important;
      width: ${({ width }) => `${width}px !important`};
    }
    .euiFlyoutHeader {
      align-items: center !important;
      display: flex !important;
      flex-direction: row !important;
      height: ${({ headerHeight }) => `${headerHeight}px !important`};
      max-height: ${({ headerHeight }) => `${headerHeight}px !important`};
      overflow: hidden;
    }
    .euiFlyoutBody {
      overflow-y: hidden !important;
      padding: 10px 24px 24px 24px !important;
    }
  }
`;

const FlyoutHeaderContainer = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
`;

// manually wrap the close button because EuiButtonIcon can't be a wrapped `styled`
const WrappedCloseButton = styled.div`
  margin-right: 10px;
`;

export const FlyoutPane = pure<FlyoutPaneProps>(
  ({ flyoutHeight, headerHeight, timelineId, onClose, children, width }) => (
    <EuiFlyoutContainer
      headerHeight={headerHeight}
      data-test-subj="euiFlyoutContainer"
      width={width}
    >
      <EuiFlyout
        size="l"
        maxWidth="95%"
        onClose={onClose}
        aria-label="Timeline Properties"
        data-test-subj="flyout"
        hideCloseButton={true}
      >
        <ResizeHandle height={flyoutHeight} timelineId={timelineId} />
        <EuiFlyoutHeader hasBorder>
          <FlyoutHeaderContainer>
            <WrappedCloseButton>
              <EuiToolTip content="Close">
                <EuiButtonIcon
                  iconType="cross"
                  aria-label="Close timeline"
                  onClick={() => onClose()}
                />
              </EuiToolTip>
            </WrappedCloseButton>
            <FlyoutHeader timelineId={timelineId} />
          </FlyoutHeaderContainer>
        </EuiFlyoutHeader>
        <EuiFlyoutBody data-test-subj="flyoutChildren">{children}</EuiFlyoutBody>
      </EuiFlyout>
    </EuiFlyoutContainer>
  )
);
