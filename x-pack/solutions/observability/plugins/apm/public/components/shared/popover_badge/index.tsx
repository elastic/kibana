/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiPopover,
  EuiPopoverTitle,
  EuiPopoverFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiBadge,
} from '@elastic/eui';
import { NOT_AVAILABLE_LABEL, CLICK_ARIAL_LABEL } from '../../../../common/i18n';

interface PopoverBadgeProps {
  title: React.ReactNode;
  iconType?: React.ReactNode;
  footer?: React.ReactNode;
  badgeLabel?: React.ReactNode;
  content: React.ReactNode;
}

export function PopoverBadge({
  title,
  badgeLabel = NOT_AVAILABLE_LABEL,
  content,
  footer,
}: PopoverBadgeProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  return (
    <EuiFlexGroup justifyContent="flexEnd">
      <EuiFlexItem grow={false}>
        <EuiPopover
          button={
            <EuiBadge
              iconType="info"
              onClick={() => setIsPopoverOpen(!isPopoverOpen)}
              onClickAriaLabel={CLICK_ARIAL_LABEL}
              iconSide="left"
              color="hollow"
            >
              {badgeLabel}
            </EuiBadge>
          }
          isOpen={isPopoverOpen}
          closePopover={() => setIsPopoverOpen(false)}
          anchorPosition="upCenter"
        >
          <EuiPopoverTitle>{title}</EuiPopoverTitle>
          <div style={{ width: '300px' }}>
            <EuiText size="s">
              <p>{content}</p>
            </EuiText>
          </div>
          {footer && <EuiPopoverFooter>{footer}</EuiPopoverFooter>}
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
