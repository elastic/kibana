/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiPopover,
} from '@elastic/eui';

interface Props {
  items: React.ReactNode[];
}

export function ContextMenu({ items }: Props) {
  const [isPopoverOpen, setPopover] = useState(false);

  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          data-test-subj="apmContextMenuButton"
          display="base"
          size="s"
          iconType="boxesVertical"
          aria-label="More"
          onClick={onButtonClick}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel
        size="s"
        items={items.map((item: React.ReactNode) => (
          <EuiContextMenuItem size="s"> {item}</EuiContextMenuItem>
        ))}
      />
    </EuiPopover>
  );
}
