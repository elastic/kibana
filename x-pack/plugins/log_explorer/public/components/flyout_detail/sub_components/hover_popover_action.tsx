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
} from '@elastic/eui';
import { ValuesType } from 'utility-types';
import { useHoverActions } from '../../../hooks/use_hover_actions';
import { LogDocument } from '..';

interface HoverPopoverActionProps {
  children: React.ReactChild;
  field: string;
  value: ValuesType<LogDocument['flattened']>;
  title?: string;
  anchorPosition?: PopoverAnchorPosition;
}

export const HoverActionPopover = ({
  children,
  title,
  field,
  value,
  anchorPosition = 'upCenter',
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
