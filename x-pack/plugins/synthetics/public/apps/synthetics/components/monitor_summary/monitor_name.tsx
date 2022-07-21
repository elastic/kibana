/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import {
  EuiPopover,
  EuiButton,
  EuiButtonIcon,
  EuiPopoverTitle,
  EuiText,
  EuiPopoverFooter,
} from '@elastic/eui';

export const MonitorName = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const closePopover = () => setIsPopoverOpen(false);

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          iconType="arrowDown"
          iconSide="right"
          onClick={() => setIsPopoverOpen(true)}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition="upCenter"
    >
      <EuiPopoverTitle>Hello, I&rsquo;m a popover title</EuiPopoverTitle>
      <div style={{ width: '300px' }}>
        <EuiText size="s">
          <p>
            Selfies migas stumptown hot chicken quinoa wolf green juice, mumblecore tattooed trust
            fund hammock truffaut taxidermy kogi.
          </p>
        </EuiText>
      </div>
      <EuiPopoverFooter>
        <EuiButton fullWidth size="s">
          Manage this thing
        </EuiButton>
      </EuiPopoverFooter>
    </EuiPopover>
  );
};
