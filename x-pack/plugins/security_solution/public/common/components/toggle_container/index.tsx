/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiButtonIcon, EuiTitle, EuiPanel } from '@elastic/eui';
import React, { useState, useEffect, useCallback } from 'react';
import type { PropsWithChildren } from 'react';
import styled from 'styled-components';
import { TOGGLE_CONTAINER_TITLE } from './translations';

interface ToggleContainerProps {
  title: React.ReactElement | string;
  onToggle?: (status: boolean) => void;
  toggleStatus?: boolean;
  append?: React.ReactElement;
  height?: number;
}

const PANEL_HEIGHT = 300;
const MOBILE_PANEL_HEIGHT = 500;
const COLLAPSED_HEIGHT = 64; // px

const StyledPanel = styled(EuiPanel)<{
  height?: number;
  $toggleStatus: boolean;
}>`
  display: flex;
  flex-direction: column;
  position: relative;
  overflow-x: hidden;
  overflow-y: ${({ $toggleStatus }) => ($toggleStatus ? 'auto' : 'hidden')};
  @media only screen and (min-width: ${(props) => props.theme.eui.euiBreakpoints.m}) {
    ${({ height, $toggleStatus }) => {
      const result = $toggleStatus
        ? `height: ${height != null ? height : PANEL_HEIGHT}px;`
        : `height:  ${COLLAPSED_HEIGHT}px`;
      return result;
    }}
  }
  ${({ $toggleStatus }) => $toggleStatus && `height: ${MOBILE_PANEL_HEIGHT}px;`}
`;

export const ToggleContainer = React.forwardRef<
  HTMLDivElement,
  PropsWithChildren<ToggleContainerProps>
>(({ title, onToggle, toggleStatus, append, children, height }, ref) => {
  const [localToggleStatus, setLocalToggleStatus] = useState(toggleStatus ?? false);

  useEffect(() => {
    if (!toggleStatus) return;
    setLocalToggleStatus(toggleStatus);
  }, [toggleStatus]);

  const toggle = useCallback(() => {
    setLocalToggleStatus((prev: boolean) => {
      if (onToggle) onToggle(!prev);
      return !prev;
    });
  }, [onToggle]);

  return (
    <div>
      <StyledPanel
        hasBorder
        panelRef={ref}
        height={localToggleStatus ? height : COLLAPSED_HEIGHT}
        paddingSize="m"
        $toggleStatus={localToggleStatus}
      >
        <div>
          <EuiFlexGroup
            responsive={false}
            gutterSize={'s'}
            className="header-section-titles"
            justifyContent="spaceBetween"
          >
            <EuiFlexGroup>
              <EuiFlexItem grow={false} data-test-subj="toggle-container-control">
                <EuiButtonIcon
                  data-test-subj="query-toggle-header"
                  aria-label={TOGGLE_CONTAINER_TITLE(localToggleStatus)}
                  color="text"
                  display="empty"
                  iconType={localToggleStatus ? 'arrowDown' : 'arrowRight'}
                  onClick={toggle}
                  size="s"
                  title={TOGGLE_CONTAINER_TITLE(localToggleStatus)}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false} data-test-subj="toggle-container-title">
                <EuiTitle size={'m'}>
                  <h4 data-test-subj="header-section-title">
                    <span className="eui-textBreakNormal">{title}</span>
                  </h4>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiFlexGroup>
              <EuiFlexItem data-test-subj="toggle-container-append" grow={false}>
                {append}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexGroup>
        </div>
      </StyledPanel>
    </div>
  );
});

ToggleContainer.displayName = 'ToggleContainer';
