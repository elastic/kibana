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
import React, { useState } from 'react';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { px } from '../../../../style/variables';

interface IconPopoverProps {
  icon: string;
  title: string;
  children: React.ReactChild;
  onClick: (isOpen: boolean) => void;
  detailsFetchStatus: FETCH_STATUS;
}
export function IconPopover({
  icon,
  title,
  children,
  onClick,
  detailsFetchStatus,
}: IconPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);

  const togglePopover = () => {
    setIsOpen((prevState) => {
      const nextState = !prevState;
      onClick(nextState);
      return nextState;
    });
  };

  const isLoading =
    detailsFetchStatus === FETCH_STATUS.LOADING ||
    detailsFetchStatus === FETCH_STATUS.PENDING;

  return (
    <EuiPopover
      anchorPosition="downCenter"
      ownFocus={false}
      button={
        <EuiButtonEmpty
          onClick={togglePopover}
          data-test-subj={`popover_${title}`}
        >
          <EuiIcon type={icon} size="l" color="black" />
        </EuiButtonEmpty>
      }
      isOpen={isOpen}
      closePopover={togglePopover}
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
