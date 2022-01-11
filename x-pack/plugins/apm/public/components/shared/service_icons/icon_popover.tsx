/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiIcon,
  EuiLoadingContent,
  EuiPanel,
  EuiPopover,
  EuiPopoverTitle,
} from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { PopoverItem } from '.';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';

interface IconPopoverProps {
  title: string;
  children: React.ReactChild;
  onClick: () => void;
  onClose: () => void;
  detailsFetchStatus: FETCH_STATUS;
  isOpen: boolean;
  icon: PopoverItem['icon'];
}

const StyledPanel = styled(EuiPanel)`
  &.serviceIcon {
    box-shadow: ${({ theme }) => {
      const shadowColor = `${theme.eui.euiShadowColor}${60}`;
      return `0 2px 2px -1px ${shadowColor}, 0 1px 5px -2px ${shadowColor} !important;`;
    }};
    height: 50px;
    padding: 0 16px;
  }
`;
export function IconPopover({
  icon,
  title,
  children,
  onClick,
  onClose,
  detailsFetchStatus,
  isOpen,
}: IconPopoverProps) {
  if (!icon.type) {
    return null;
  }
  const isLoading = detailsFetchStatus === FETCH_STATUS.LOADING;
  return (
    <EuiPopover
      anchorPosition="downCenter"
      ownFocus={false}
      button={
        <StyledPanel
          onClick={onClick}
          data-test-subj={`popover_${title}`}
          className="serviceIcon"
        >
          <EuiIcon
            type={icon.type}
            size={icon.size ?? 'l'}
            color={icon.color}
          />
        </StyledPanel>
      }
      isOpen={isOpen}
      closePopover={onClose}
    >
      <EuiPopoverTitle>{title}</EuiPopoverTitle>
      <div style={{ minWidth: 300 }}>
        {isLoading ? (
          <EuiLoadingContent data-test-subj="loading-content" />
        ) : (
          children
        )}
      </div>
    </EuiPopover>
  );
}
