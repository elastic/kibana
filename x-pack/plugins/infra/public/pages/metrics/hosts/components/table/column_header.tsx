/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useRef, useCallback, useLayoutEffect } from 'react';
import { EuiPopover, EuiIcon, EuiFlexGroup, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import { TooltipContent } from '../../../../../common/visualizations/metric_explanation/tooltip_content';
import { useBoolean } from '../../../../../hooks/use_boolean';

interface Props {
  label: string;
  toolTip?: string;
  formula?: string;
  popoverContainerRef?: React.RefObject<HTMLDivElement>;
}

const SEARCH_BAR_OFFSET = 250;
const ANCHOR_SPACING = 10;

const findTableParentElement = (element: HTMLElement | null): HTMLElement | null => {
  let currentElement = element;

  while (currentElement && currentElement.className !== APP_WRAPPER_CLASS) {
    currentElement = currentElement.parentElement;
  }
  return currentElement;
};

export const ColumnHeader = React.memo(
  ({ label, toolTip, formula, popoverContainerRef }: Props) => {
    const buttonRef = useRef<HTMLDivElement | null>(null);
    const containerRef = useRef<HTMLElement | null>(null);
    const [offset, setOffset] = useState(0);
    const [isPopoverOpen, { off: closePopover, toggle: togglePopover }] = useBoolean(false);

    const { euiTheme } = useEuiTheme();

    useLayoutEffect(() => {
      containerRef.current = findTableParentElement(buttonRef.current);
    }, []);

    const calculateHeaderOffset = () => {
      const { top: containerTop = 0 } = containerRef.current?.getBoundingClientRect() ?? {};
      const headerOffset = containerTop + window.scrollY;

      return headerOffset;
    };

    const onButtonClick = useCallback(
      (e: React.MouseEvent<SVGElement>) => {
        e.preventDefault();
        e.stopPropagation();
        const { top: buttonTop = 0 } = buttonRef.current?.getBoundingClientRect() ?? {};

        // gets the actual page position, discounting anything above the page content (e.g: header, dismissible banner)
        const headerOffset = calculateHeaderOffset();
        // determines if the scroll position is close to overlapping with the button
        const scrollPosition = buttonTop - headerOffset - SEARCH_BAR_OFFSET;
        const isAboveElement = scrollPosition <= 0;

        // offset to be taken into account when positioning the popover
        setOffset(headerOffset * (isAboveElement ? -1 : 1) + ANCHOR_SPACING);
        togglePopover();
      },
      [togglePopover]
    );

    return (
      <EuiFlexGroup gutterSize="xs">
        <div
          css={css`
            overflow-wrap: break-word !important;
            word-break: break-word;
            min-width: 0;
            text-overflow: ellipsis;
            overflow: hidden;
          `}
        >
          {label}
        </div>

        {toolTip && (
          <EuiPopover
            panelPaddingSize="s"
            buttonRef={(el) => (buttonRef.current = el)}
            button={
              <EuiIcon
                data-test-subj="hostsViewTableColumnPopoverButton"
                type="questionInCircle"
                onClick={onButtonClick}
              />
            }
            insert={
              popoverContainerRef && popoverContainerRef?.current
                ? {
                    sibling: popoverContainerRef.current,
                    position: 'after',
                  }
                : undefined
            }
            offset={offset}
            anchorPosition={offset <= 0 ? 'downCenter' : 'upCenter'}
            isOpen={isPopoverOpen}
            closePopover={closePopover}
            zIndex={Number(euiTheme.levels.header) - 1}
            panelStyle={{ maxWidth: 350 }}
          >
            <TooltipContent formula={formula} description={toolTip} showDocumentationLink />
          </EuiPopover>
        )}
      </EuiFlexGroup>
    );
  }
);
