/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiSkeletonText,
  EuiPopover,
  EuiPopoverTitle,
} from '@elastic/eui';
import React from 'react';
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
        <EuiButtonIcon
          display="base"
          color="text"
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
          <EuiSkeletonText data-test-subj="loading-content" />
        ) : (
          children
        )}
      </div>
    </EuiPopover>
  );
}
