/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef, useState } from 'react';
import {
  EuiFlexGroup,
  EuiPopover,
  IconType,
  EuiButtonIcon,
  EuiPopoverTitle,
  EuiToolTip,
} from '@elastic/eui';

export interface HoverActionType {
  id: string;
  tooltipContent: string;
  iconType: IconType;
  onClick: () => void;
  display: boolean;
}

interface HoverPopoverActionProps {
  children: React.ReactChild;
  actions: HoverActionType[];
  title: string;
}

export const HoverActionPopover = ({ children, actions, title }: HoverPopoverActionProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const leaveTimer = useRef<NodeJS.Timeout | null>(null);

  // The timeout hack is required because we are using a Popover which ideally should be used with a mouseclick,
  // but we are using it as a Tooltip. Which means we now need to manually handle the open and close
  // state using the mouse hover events. This cause the popover to close even before the user could
  // navigate actions inside it. Hence, to prevent this, we need this hack
  const onMouseEnter = () => {
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current);
    }
    setIsPopoverOpen(true);
  };

  const onMouseLeave = () => {
    leaveTimer.current = setTimeout(() => setIsPopoverOpen(false), 100);
  };

  return (
    <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <EuiPopover
        button={children}
        isOpen={isPopoverOpen}
        anchorPosition="upCenter"
        panelPaddingSize="s"
        panelStyle={{ minWidth: '24px' }}
      >
        <EuiPopoverTitle className="eui-textBreakWord" css={{ maxWidth: '200px' }}>
          {title}
        </EuiPopoverTitle>
        <EuiFlexGroup wrap gutterSize="none" alignItems="center" justifyContent="spaceBetween">
          {actions.map((action) => (
            <EuiToolTip content={action.tooltipContent} key={action.id}>
              <EuiButtonIcon
                size="xs"
                iconType={action.iconType}
                aria-label={action.tooltipContent as string}
                onClick={() => action.onClick()}
              />
            </EuiToolTip>
          ))}
        </EuiFlexGroup>
      </EuiPopover>
    </div>
  );
};
