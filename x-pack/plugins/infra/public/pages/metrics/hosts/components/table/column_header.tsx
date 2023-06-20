/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useRef, useCallback } from 'react';
import { EuiPopover, EuiIcon, EuiFlexGroup, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useBoolean } from '../../../../../hooks/use_boolean';
import { useKibanaHeader } from '../../../../../hooks/use_kibana_header';
import { TooltipContent } from '../metric_explanation/tooltip_content';

interface Props {
  label: string;
  toolTip?: string;
  formula?: string;
  popoverContainerRef?: React.RefObject<HTMLDivElement>;
}

const SEARCH_BAR_OFFSET = 250;
const ANCHOR_SPACING = 10;

export const ColumnHeader = React.memo(
  ({ label, toolTip, formula, popoverContainerRef }: Props) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [offset, setOffset] = useState(0);
    const [isPopoverOpen, { off: closePopover, toggle: togglePopover }] = useBoolean(false);

    const { euiTheme } = useEuiTheme();
    const { headerHeight } = useKibanaHeader();

    const onButtonClick = useCallback(
      (e: React.MouseEvent<SVGElement>) => {
        e.preventDefault();
        e.stopPropagation();

        const scrollPosition =
          (containerRef.current?.getBoundingClientRect().y ?? 0) - SEARCH_BAR_OFFSET - headerHeight;

        setOffset(headerHeight * (scrollPosition <= 0 ? -1 : 1) + ANCHOR_SPACING);
        togglePopover();
      },
      [headerHeight, togglePopover]
    );

    return (
      <EuiFlexGroup gutterSize="xs" ref={containerRef}>
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
            display=""
            panelPaddingSize="s"
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
