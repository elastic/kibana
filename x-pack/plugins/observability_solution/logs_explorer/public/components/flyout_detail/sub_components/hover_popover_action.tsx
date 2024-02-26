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
  EuiButtonIcon,
  EuiPopoverTitle,
  EuiToolTip,
  PopoverAnchorPosition,
  type EuiPopoverProps,
} from '@elastic/eui';
import { useHoverActions } from '../../../hooks/use_hover_actions';

interface HoverPopoverActionProps {
  children: React.ReactChild;
  field: string;
  value: string;
  title?: string;
  anchorPosition?: PopoverAnchorPosition;
  display?: EuiPopoverProps['display'];
}

export const HoverActionPopover = ({
  children,
  title,
  field,
  value,
  anchorPosition = 'upCenter',
  display = 'inline-block',
}: HoverPopoverActionProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const leaveTimer = useRef<NodeJS.Timeout | null>(null);
  const hoverActions = useHoverActions({ field, value });

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
        anchorPosition={anchorPosition}
        panelPaddingSize="s"
        panelStyle={{ minWidth: '24px' }}
        display={display}
      >
        {title && (
          <EuiPopoverTitle className="eui-textBreakWord" css={{ maxWidth: '200px' }}>
            {title}
          </EuiPopoverTitle>
        )}
        <EuiFlexGroup wrap gutterSize="none" alignItems="center" justifyContent="spaceBetween">
          {hoverActions.map((action) => (
            <EuiToolTip content={action.tooltipContent} key={action.id}>
              <EuiButtonIcon
                data-test-subj="logsExplorerHoverActionPopoverButton"
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
