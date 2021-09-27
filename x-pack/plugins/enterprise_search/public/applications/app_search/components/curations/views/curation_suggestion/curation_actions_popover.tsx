/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import {
  EuiButtonIcon,
  EuiListGroup,
  EuiListGroupItem,
  EuiPopover,
  EuiPopoverTitle,
} from '@elastic/eui';

export const CurationActionsPopover: React.FC = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onButtonClick = () => setIsPopoverOpen(!isPopoverOpen);
  const closePopover = () => setIsPopoverOpen(false);

  const button = (
    <EuiButtonIcon
      iconType="boxesVertical"
      aria-label="More suggestion actions"
      color="text"
      onClick={onButtonClick}
    />
  );
  return (
    <EuiPopover button={button} isOpen={isPopoverOpen} closePopover={closePopover}>
      <EuiPopoverTitle>Manage suggestion</EuiPopoverTitle>
      <EuiListGroup flush>
        <EuiListGroupItem size="xs" iconType="check" label="Accept this suggestion" />
        <EuiListGroupItem
          size="xs"
          iconType="check"
          label="Automate - always accept new suggestions for this query"
        />
        <EuiListGroupItem size="xs" iconType="cross" label="Reject this suggestion" />
        <EuiListGroupItem
          size="xs"
          iconType="bellSlash"
          label="Reject and turn off suggestions for this query"
        />
      </EuiListGroup>
    </EuiPopover>
  );
};
