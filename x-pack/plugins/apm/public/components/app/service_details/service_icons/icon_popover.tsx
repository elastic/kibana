/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiButtonEmpty,
  EuiIcon,
  EuiLoadingContent,
  EuiPopover,
  EuiPopoverTitle,
} from '@elastic/eui';
import React from 'react';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { px } from '../../../../style/variables';

interface IconPopoverProps {
  title: string;
  children: React.ReactChild;
  onClick: () => void;
  onClose: () => void;
  detailsFetchStatus: FETCH_STATUS;
  isOpen: boolean;
  icon?: string;
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
  if (!icon) {
    return null;
  }
  const isLoading = detailsFetchStatus === FETCH_STATUS.LOADING;
  return (
    <EuiPopover
      anchorPosition="downCenter"
      ownFocus={false}
      button={
        <EuiButtonEmpty onClick={onClick} data-test-subj={`popover_${title}`}>
          <EuiIcon type={icon} size="l" color="black" />
        </EuiButtonEmpty>
      }
      isOpen={isOpen}
      closePopover={onClose}
    >
      <EuiPopoverTitle>{title}</EuiPopoverTitle>
      <div style={{ minWidth: px(300) }}>
        {isLoading ? (
          <EuiLoadingContent data-test-subj="loading-content" />
        ) : (
          children
        )}
      </div>
    </EuiPopover>
  );
}
