/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';

import { stopPropagationAndPreventDefault } from '../../../../common';
import { TooltipWithKeyboardShortcut } from '../../tooltip_with_keyboard_shortcut';
import { getAdditionalScreenReaderOnlyContext } from '../utils';
import { HoverActionComponentProps } from './types';

export const MORE_ACTIONS = i18n.translate('xpack.timelines.hoverActions.moreActions', {
  defaultMessage: 'More actions',
});

export const FILTER_OUT_VALUE_KEYBOARD_SHORTCUT = 'm';

interface OverflowButtonProps extends HoverActionComponentProps {
  Component?: typeof EuiButtonEmpty | typeof EuiButtonIcon | typeof EuiContextMenuItem;
  items: JSX.Element[];
}

const OverflowButton: React.FC<OverflowButtonProps> = React.memo(
  ({
    closePopOver,
    Component,
    defaultFocusedButtonRef,
    field,
    items,
    keyboardEvent,
    ownFocus,
    showTooltip = false,
    value,
  }) => {
    const [isOverflowPopoverOpen, setOverflowPopover] = useState(false);

    const onOverflowButtonClick = useCallback(() => {
      setOverflowPopover(!isOverflowPopoverOpen);
    }, [isOverflowPopoverOpen]);

    const closeOverflowPopover = useCallback(() => {
      if (closePopOver) {
        closePopOver();
      }
      setOverflowPopover(false);
    }, [closePopOver]);

    useEffect(() => {
      if (!ownFocus) {
        return;
      }
      if (keyboardEvent?.key === FILTER_OUT_VALUE_KEYBOARD_SHORTCUT) {
        stopPropagationAndPreventDefault(keyboardEvent);
        onOverflowButtonClick();
      }
    }, [keyboardEvent, onOverflowButtonClick, ownFocus]);

    const overflowItems = useMemo(
      () =>
        items.reduce<JSX.Element>((actionItems, item) => {
          return item.isenabled ? [...actionItems, item.content] : actionItems;
        }, []),
      [items]
    );

    const popover = useMemo(
      () => (
        <EuiPopover
          id="contextMenuExample"
          button={
            Component ? (
              <Component
                aria-label={MORE_ACTIONS}
                buttonRef={defaultFocusedButtonRef}
                data-test-subj="add-to-timeline"
                icon="boxesHorizontal"
                iconType="boxesHorizontal"
                onClick={onOverflowButtonClick}
                title={MORE_ACTIONS}
              >
                {MORE_ACTIONS}
              </Component>
            ) : (
              <EuiButtonIcon
                aria-label={MORE_ACTIONS}
                buttonRef={defaultFocusedButtonRef}
                className="timelines__hoverActionButton"
                data-test-subj="more-actions"
                iconSize="s"
                iconType="boxesHorizontal"
                onClick={onOverflowButtonClick}
              />
            )
          }
          isOpen={isOverflowPopoverOpen}
          closePopover={closeOverflowPopover}
          panelPaddingSize="none"
          anchorPosition="downLeft"
        >
          <EuiContextMenuPanel items={overflowItems} />
        </EuiPopover>
      ),
      [
        Component,
        defaultFocusedButtonRef,
        onOverflowButtonClick,
        isOverflowPopoverOpen,
        closeOverflowPopover,
        overflowItems,
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
