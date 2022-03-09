/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiLoadingContent,
  EuiPopover,
  EuiPopoverTitle,
} from '@elastic/eui';
import { rgba } from 'polished';
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

const StyledButtonIcon = styled(EuiButtonIcon)`
  &.serviceIcon_button {
    box-shadow: ${({ theme }) => {
      const shadowColor = theme.eui.euiShadowColor;
      return `0px 0.7px 1.4px ${rgba(shadowColor, 0.07)},
      0px 1.9px 4px ${rgba(shadowColor, 0.05)},
      0px 4.5px 10px ${rgba(shadowColor, 0.05)} !important;`;
    }}
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
        <StyledButtonIcon
          display="fill"
          color="ghost"
          onClick={onClick}
          iconType={icon.type}
          iconSize={icon.size ?? 'l'}
          className="serviceIcon_button"
          data-test-subj={`popover_${title}`}
          size="m"
        />
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
