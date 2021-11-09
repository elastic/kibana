/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPopover } from '@elastic/eui';
import {
  HOVER_ACTIONS_ALWAYS_SHOW_CLASS_NAME,
  IS_DRAGGING_CLASS_NAME,
} from '@kbn/securitysolution-t-grid';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

/**
 * To avoid expensive changes to the DOM, delay showing the popover menu
 */
const HOVER_INTENT_DELAY = 100; // ms

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const WithHoverActionsPopover = styled(EuiPopover as any)`
  .euiPopover__anchor {
    width: 100%;
  }
` as unknown as typeof EuiPopover;

interface Props {
  /**
   * Always show the hover menu contents (default: false)
   */
  alwaysShow?: boolean;
  /**
   * The hover menu is closed whenever this prop changes
   */
  closePopOverTrigger?: boolean;
  /**
   * The contents of the hover menu. It is highly recommended you wrap this
   * content in a `div` with `position: absolute` to prevent it from effecting
   * layout, and to adjust it's position via `top` and `left`.
   */
  hoverContent?: JSX.Element;
  /**
   * The content that will be wrapped with hover actions. In addition to
   * rendering the `hoverContent` when the user hovers, this render prop
   * passes `showHoverContent` to provide a signal that it is in the hover
   * state.
   */
  render: (showHoverContent: boolean) => JSX.Element;

  /**
   * This optional callback is invoked when a close is requested via user
   * intent, i.e. by clicking outside of the popover, moving the mouse
   * away, or pressing Escape. It's only a "request" to close, because
   * the hover menu will NOT be closed if `alwaysShow` is `true`.
   *
   * Use this callback when you're managing the state of `alwaysShow`
   * (outside of this component), and you want to be informed of a user's
   * intent to close the hover menu.
   */
  onCloseRequested?: () => void;
}

/**
 * Decorates it's children with actions that are visible on hover.
 * This component does not enforce an opinion on the styling and
 * positioning of the hover content, but see the documentation for
 * the `hoverContent` for tips on (not) effecting layout on-hover.
 *
 * In addition to rendering the `hoverContent` prop on hover, this
 * component also passes `showHoverContent` as a render prop, which
 * provides a signal to the content that the user is in a hover state.
 *
 * IMPORTANT: This hover menu delegates focus management to the
 * `hoverContent` and does NOT own focus, because it should not
 * automatically "steal" focus. You must manage focus ownership,
 * otherwise it will be difficult for keyboard-only and screen
 * reader users to navigate to and from your popover.
 */
export const WithHoverActions = React.memo<Props>(
  ({ alwaysShow = false, closePopOverTrigger, hoverContent, onCloseRequested, render }) => {
    const [isOpen, setIsOpen] = useState(hoverContent != null && alwaysShow);
    const [showHoverContent, setShowHoverContent] = useState(false);
    const [, setHoverTimeout] = useState<number | undefined>(undefined);

    const tryClosePopover = useCallback(() => {
      setHoverTimeout((prevHoverTimeout) => {
        clearTimeout(prevHoverTimeout);
        return undefined;
      });

      setShowHoverContent(false);

      if (onCloseRequested != null) {
        onCloseRequested();
      }
    }, [onCloseRequested]);

    const onMouseEnter = useCallback(() => {
      setHoverTimeout(
        Number(
          setTimeout(() => {
            // NOTE: the following read from the DOM is expensive, but not as
            // expensive as the default behavior, which adds a div to the body,
            // which-in turn performs a more expensive change to the layout
            if (!document.body.classList.contains(IS_DRAGGING_CLASS_NAME)) {
              setShowHoverContent(true);
            }
          }, HOVER_INTENT_DELAY)
        )
      );
    }, [setHoverTimeout, setShowHoverContent]);

    const onMouseLeave = useCallback(() => {
      if (!alwaysShow) {
        tryClosePopover();
      }
    }, [alwaysShow, tryClosePopover]);

    const onKeyDown = useCallback(
      (keyboardEvent: React.KeyboardEvent) => {
        if (isOpen && keyboardEvent.key === 'Escape') {
          onMouseLeave();
        }
      },
      [isOpen, onMouseLeave]
    );

    const content = useMemo(
      () => (
        <div data-test-subj="withHoverActionsButton" onMouseEnter={onMouseEnter}>
          {render(showHoverContent)}
        </div>
      ),
      [onMouseEnter, render, showHoverContent]
    );

    useEffect(() => {
      setIsOpen(hoverContent != null && (showHoverContent || alwaysShow));
    }, [hoverContent, showHoverContent, alwaysShow]);

    useEffect(() => {
      setShowHoverContent(false);
    }, [closePopOverTrigger]); // NOTE: the `closePopOverTrigger` dependency here will close the hover menu whenever `closePopOverTrigger` changes

    return (
      <div
        className={alwaysShow ? HOVER_ACTIONS_ALWAYS_SHOW_CLASS_NAME : ''}
        onMouseLeave={onMouseLeave}
      >
        <WithHoverActionsPopover
          anchorPosition={'downCenter'}
          button={content}
          closePopover={tryClosePopover}
          hasArrow={false}
          isOpen={isOpen}
          ownFocus={false}
          panelPaddingSize="none"
          panelClassName="withHoverActions__popover"
          repositionOnScroll={true}
        >
          {isOpen ? <div onKeyDown={onKeyDown}>{hoverContent}</div> : null}
        </WithHoverActionsPopover>
      </div>
    );
  }
);

WithHoverActions.displayName = 'WithHoverActions';
