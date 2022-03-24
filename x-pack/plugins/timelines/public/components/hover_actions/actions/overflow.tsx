/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';

import styled from 'styled-components';
import { stopPropagationAndPreventDefault } from '../../../../common/utils/accessibility';
import { TooltipWithKeyboardShortcut } from '../../tooltip_with_keyboard_shortcut';
import { getAdditionalScreenReaderOnlyContext } from '../utils';
import { HoverActionComponentProps } from './types';

export const MORE_ACTIONS = i18n.translate('xpack.timelines.hoverActions.moreActions', {
  defaultMessage: 'More actions',
});

export const FILTER_OUT_VALUE_KEYBOARD_SHORTCUT = 'm';

export interface OverflowButtonProps extends HoverActionComponentProps {
  closePopOver: () => void;
  Component?: typeof EuiButtonEmpty | typeof EuiButtonIcon | typeof EuiContextMenuItem;
  items: JSX.Element[];
  isOverflowPopoverOpen: boolean;
}

const StyledEuiContextMenuPanel = styled(EuiContextMenuPanel)`
  visibility: inherit;
`;

const OverflowButton: React.FC<OverflowButtonProps> = React.memo(
  ({
    closePopOver,
    Component,
    defaultFocusedButtonRef,
    field,
    items,
    isOverflowPopoverOpen,
    keyboardEvent,
    ownFocus,
    onClick,
    showTooltip = false,
    value,
  }) => {
    useEffect(() => {
      if (!ownFocus) {
        return;
      }
      if (keyboardEvent?.key === FILTER_OUT_VALUE_KEYBOARD_SHORTCUT) {
        stopPropagationAndPreventDefault(keyboardEvent);
        if (onClick != null) {
          onClick();
        }
      }
    }, [keyboardEvent, onClick, ownFocus]);

    const popover = useMemo(
      () => (
        <EuiPopover
          button={
            Component ? (
              <Component
                aria-label={MORE_ACTIONS}
                buttonRef={defaultFocusedButtonRef}
                data-test-subj={`more-actions-${field}`}
                icon="boxesHorizontal"
                iconType="boxesHorizontal"
                onClick={onClick}
                title={MORE_ACTIONS}
              >
                {MORE_ACTIONS}
              </Component>
            ) : (
              <EuiButtonIcon
                aria-label={MORE_ACTIONS}
                buttonRef={defaultFocusedButtonRef}
                className="timelines__hoverActionButton"
                data-test-subj={`more-actions-${field}`}
                iconSize="s"
                iconType="boxesHorizontal"
                onClick={onClick}
              />
            )
          }
          isOpen={isOverflowPopoverOpen}
          closePopover={closePopOver}
          panelPaddingSize="none"
          panelClassName="withHoverActions__popover"
          repositionOnScroll={true}
          anchorPosition="downLeft"
        >
          <StyledEuiContextMenuPanel items={items} />
        </EuiPopover>
      ),
      [
        Component,
        defaultFocusedButtonRef,
        field,
        onClick,
        isOverflowPopoverOpen,
        closePopOver,
        items,
      ]
    );

    return showTooltip ? (
      <EuiToolTip
        content={
          <TooltipWithKeyboardShortcut
            additionalScreenReaderOnlyContext={getAdditionalScreenReaderOnlyContext({
              field,
              value,
            })}
            content={MORE_ACTIONS}
            shortcut={FILTER_OUT_VALUE_KEYBOARD_SHORTCUT}
            showShortcut={ownFocus}
          />
        }
      >
        {popover}
      </EuiToolTip>
    ) : (
      popover
    );
  }
);

OverflowButton.displayName = 'OverflowButton';

// eslint-disable-next-line import/no-default-export
export { OverflowButton as default };
