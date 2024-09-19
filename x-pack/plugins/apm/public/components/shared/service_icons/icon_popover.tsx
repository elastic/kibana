/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiIcon,
  EuiLoadingContent,
  EuiPopover,
  EuiPopoverTitle,
} from '@elastic/eui';
import React from 'react';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';

interface IconPopoverProps {
  title: string;
  children: React.ReactChild;
  onClick: () => void;
  onClose: () => void;
  detailsFetchStatus: FETCH_STATUS;
  isOpen: boolean;
  icon: {
    type?: string;
    size?: 's' | 'm' | 'l';
    color?: string;
  };
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
        <EuiButtonEmpty onClick={onClick} data-test-subj={`popover_${title}`}>
          <EuiIcon
            type={icon.type}
            size={icon.size ?? 'l'}
            color={icon.color ?? 'text'}
          />
        </EuiButtonEmpty>
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
