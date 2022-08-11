/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPopover } from '@elastic/eui';
import React, { useCallback, useState } from 'react';

import { LinkIcon, LinkIconProps } from '../link_icon';
import { BarAction } from './styles';

const Popover = React.memo<UtilityBarActionProps>(
  ({ children, color, iconSide, iconSize, iconType, popoverContent, disabled, ownFocus }) => {
    const [popoverState, setPopoverState] = useState(false);

    const closePopover = useCallback(() => setPopoverState(false), [setPopoverState]);

    return (
      <EuiPopover
        ownFocus={ownFocus}
        button={
          <LinkIcon
            color={color}
            iconSide={iconSide}
            iconSize={iconSize}
            iconType={iconType}
            onClick={() => setPopoverState(!popoverState)}
            disabled={disabled}
          >
            {children}
          </LinkIcon>
        }
        closePopover={() => setPopoverState(false)}
        isOpen={popoverState}
        repositionOnScroll
      >
        {popoverContent?.(closePopover)}
      </EuiPopover>
    );
  }
);

Popover.displayName = 'Popover';

export interface UtilityBarActionProps extends LinkIconProps {
  popoverContent?: (closePopover: () => void) => React.ReactNode;
  ownFocus?: boolean;
  dataTestSubj?: string;
}

export const UtilityBarAction = React.memo<UtilityBarActionProps>(
  ({
    dataTestSubj,
    children,
    color,
    disabled,
    href,
    iconSide,
    iconSize,
    iconType,
    ownFocus,
    onClick,
    popoverContent,
  }) => (
    <BarAction data-test-subj={dataTestSubj}>
      {popoverContent ? (
        <Popover
          disabled={disabled}
          color={color}
          iconSide={iconSide}
          iconSize={iconSize}
          iconType={iconType}
          ownFocus={ownFocus}
          popoverContent={popoverContent}
        >
          {children}
        </Popover>
      ) : (
        <LinkIcon
          color={color}
          disabled={disabled}
          href={href}
          iconSide={iconSide}
          iconSize={iconSize}
          iconType={iconType}
          onClick={onClick}
        >
          {children}
        </LinkIcon>
      )}
    </BarAction>
  )
);

UtilityBarAction.displayName = 'UtilityBarAction';
