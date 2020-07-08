/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPopover } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

import { IS_DRAGGING_CLASS_NAME } from '../drag_and_drop/helpers';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const WithHoverActionsPopover = (styled(EuiPopover as any)`
  .euiPopover__anchor {
    width: 100%;
  }
` as unknown) as typeof EuiPopover;

interface Props {
  /**
   * Always show the hover menu contents (default: false)
   */
  alwaysShow?: boolean;
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
 */
export const WithHoverActions = React.memo<Props>(
  ({ alwaysShow = false, closePopOverTrigger, hoverContent, render }) => {
    const [isOpen, setIsOpen] = useState(hoverContent != null && alwaysShow);
    const [showHoverContent, setShowHoverContent] = useState(false);
    const onMouseEnter = useCallback(() => {
      // NOTE: the following read from the DOM is expensive, but not as
      // expensive as the default behavior, which adds a div to the body,
      // which-in turn performs a more expensive change to the layout
      if (!document.body.classList.contains(IS_DRAGGING_CLASS_NAME)) {
        setShowHoverContent(true);
      }
    }, []);

    const onMouseLeave = useCallback(() => {
      setShowHoverContent(false);
    }, []);

    const content = useMemo(() => <>{render(showHoverContent)}</>, [render, showHoverContent]);

    useEffect(() => {
      setIsOpen(hoverContent != null && (showHoverContent || alwaysShow));
    }, [hoverContent, showHoverContent, alwaysShow]);

    useEffect(() => {
      setShowHoverContent(false);
    }, [closePopOverTrigger]);

    return (
      <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
        <WithHoverActionsPopover
          anchorPosition={'downCenter'}
          button={content}
          closePopover={onMouseLeave}
          hasArrow={false}
          isOpen={isOpen}
          panelPaddingSize={!alwaysShow ? 's' : 'none'}
        >
          {isOpen ? <>{hoverContent}</> : null}
        </WithHoverActionsPopover>
      </div>
    );
  }
);

WithHoverActions.displayName = 'WithHoverActions';
