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
import * as i18n from './translations';

interface FlyoutPaneProps {
  children: React.ReactNode;
  flyoutHeight: number;
  headerHeight: number;
  onClose: () => void;
  timelineId: string;
  width: number;
}

const EuiFlyoutContainer = styled.div<{ headerHeight: number; width: number }>`
  .timeline-flyout {
    min-width: 150px;
    width: ${({ width }) => `${width}px`};
  }
  .timeline-flyout-header {
    align-items: center;
    display: flex;
    flex-direction: row;
    height: ${({ headerHeight }) => `${headerHeight}px`};
    max-height: ${({ headerHeight }) => `${headerHeight}px`};
    overflow: hidden;
  }
  .timeline-flyout-body {
    overflow-y: hidden;
    padding: 10px 24px 24px 24px;
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
        className="timeline-flyout"
        size="l"
        maxWidth="95%"
        onClose={onClose}
        aria-label={i18n.TIMELINE_DESCRIPTION}
        data-test-subj="flyout"
        hideCloseButton={true}
      >
        <ResizeHandle height={flyoutHeight} timelineId={timelineId} />
        <EuiFlyoutHeader hasBorder className="timeline-flyout-header">
          <FlyoutHeaderContainer>
            <WrappedCloseButton>
              <EuiToolTip content={i18n.CLOSE_TIMELINE}>
                <EuiButtonIcon
                  iconType="cross"
                  aria-label={i18n.CLOSE_TIMELINE}
                  onClick={() => onClose()}
                />
              </EuiToolTip>
            </WrappedCloseButton>
            <FlyoutHeader timelineId={timelineId} />
          </FlyoutHeaderContainer>
        </EuiFlyoutHeader>
        <EuiFlyoutBody data-test-subj="flyoutChildren" className="timeline-flyout-body">
          {children}
        </EuiFlyoutBody>
      </EuiFlyout>
    </EuiFlyoutContainer>
  )
);
