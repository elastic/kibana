/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPopover } from '@elastic/eui';
import React from 'react';
import { LinkIcon, LinkIconProps } from '../link_icon';

import { BarAction } from './styles';

export interface UtilityBarActionProps extends Omit<LinkIconProps, 'onClick'> {
  isPopoverOpen: boolean;
  buttonTitle: string;
  closePopover: () => void;
  onButtonClick: () => void;
  dataTestSubj?: string;
}

export const UtilityBarBulkActions = React.memo<UtilityBarActionProps>(
  ({
    dataTestSubj,
    children,
    color,
    disabled,
    href,
    iconSide,
    iconSize,
    iconType,
    isPopoverOpen,
    onButtonClick,
    buttonTitle,
    closePopover,
  }) => {
    return (
      <BarAction data-test-subj={dataTestSubj}>
        <EuiPopover
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          panelPaddingSize="none"
          button={
            <LinkIcon
              color={color}
              disabled={disabled}
              href={href}
              iconSide={iconSide}
              iconSize={iconSize}
              iconType={iconType}
              onClick={onButtonClick}
              dataTestSubj={
                dataTestSubj ? `${dataTestSubj}-link-icon` : 'utility-bar-bulk-actions-link-icon'
              }
            >
              {buttonTitle}
            </LinkIcon>
          }
        >
          {children}
        </EuiPopover>
      </BarAction>
    );
  }
);

UtilityBarBulkActions.displayName = 'UtilityBarBulkActions';
