/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPopover, PanelPaddingSize, EuiButtonEmpty } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import styled, { css } from 'styled-components';

import { LinkIcon, LinkIconProps } from '../link_icon';
import { BarAction } from './styles';

const LoadingButtonEmpty = styled(EuiButtonEmpty)`
  ${({ theme }) => css`
    &.euiButtonEmpty.euiButtonEmpty--xSmall {
      height: ${theme.eui.euiSize};
      .euiButtonEmpty__content {
        padding: 0;
      }
    }
  `}
`;

const Popover = React.memo<UtilityBarActionProps>(
  ({
    children,
    color,
    iconSide,
    iconSize,
    iconType,
    popoverContent,
    disabled,
    ownFocus,
    dataTestSubj,
    popoverPanelPaddingSize,
    onClick,
  }) => {
    const [popoverState, setPopoverState] = useState(false);

    const closePopover = useCallback(() => setPopoverState(false), [setPopoverState]);

    const handleLinkIconClick = useCallback(() => {
      onClick?.();
      setPopoverState(!popoverState);
    }, [popoverState, onClick]);

    return (
      <EuiPopover
        ownFocus={ownFocus}
        panelPaddingSize={popoverPanelPaddingSize}
        button={
          <LinkIcon
            dataTestSubj={dataTestSubj}
            color={color}
            iconSide={iconSide}
            iconSize={iconSize}
            iconType={iconType}
            onClick={handleLinkIconClick}
            disabled={disabled}
          >
            {children}
          </LinkIcon>
        }
        closePopover={closePopover}
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
  popoverPanelPaddingSize?: PanelPaddingSize;
  dataTestSubj: string;
  ownFocus?: boolean;
  inProgress?: boolean;
}

export const UtilityBarAction = React.memo<UtilityBarActionProps>(
  ({
    children,
    color,
    dataTestSubj,
    disabled,
    href,
    iconSide,
    iconSize,
    iconType,
    ownFocus,
    onClick,
    popoverContent,
    popoverPanelPaddingSize,
    inProgress,
  }) => {
    if (inProgress) {
      return (
        <BarAction>
          <LoadingButtonEmpty
            data-test-subj={`${dataTestSubj}-progress`}
            size="xs"
            className="eui-alignTop"
            isLoading
            iconSide="right"
          >
            {children}
          </LoadingButtonEmpty>
        </BarAction>
      );
    }

    return (
      <BarAction data-test-subj={dataTestSubj}>
        {popoverContent ? (
          <Popover
            onClick={onClick}
            dataTestSubj={`${dataTestSubj}-popover`}
            disabled={disabled}
            color={color}
            iconSide={iconSide}
            iconSize={iconSize}
            iconType={iconType}
            ownFocus={ownFocus}
            popoverPanelPaddingSize={popoverPanelPaddingSize}
            popoverContent={popoverContent}
          >
            {children}
          </Popover>
        ) : (
          <LinkIcon
            color={color}
            dataTestSubj={`${dataTestSubj}-linkIcon`}
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
    );
  }
);

UtilityBarAction.displayName = 'UtilityBarAction';
