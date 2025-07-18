/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiAccordionProps } from '@elastic/eui';
import { EuiAccordion, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { Bar } from './bar';
import { BarDetails } from './bar_details';
import { TOGGLE_BUTTON_WIDTH, ToggleAccordionButton } from './toggle_accordion_button';
import { useTraceWaterfallContext } from './trace_waterfall_context';
import type { TraceWaterfallItem } from './use_trace_waterfall';

export interface Props {
  item: TraceWaterfallItem;
  childrenCount: number;
  state: EuiAccordionProps['forceState'];
  onToggle: (id: string) => void;
}

export const ACCORDION_PADDING_LEFT = 8; // px
export const ACCORDION_HEIGHT = 48; // px
export const BORDER_THICKNESS = 1; // px

export function TraceItemRow({ item, childrenCount, state, onToggle }: Props) {
  const { duration, margin, showAccordion, onClick, onErrorClick, highlightedTraceId } =
    useTraceWaterfallContext();
  const isHighlighted = highlightedTraceId === item.id;
  const widthPercent = (item.duration / duration) * 100;
  const leftPercent = ((item.offset + item.skew) / duration) * 100;
  const hasToggle = showAccordion && childrenCount > 0;
  const accordionIndent = ACCORDION_PADDING_LEFT * item.depth;
  const { euiTheme } = useEuiTheme();

  function calculateMarginLeft() {
    const marginLeft =
      margin.left - accordionIndent - (item.hasError ? BORDER_THICKNESS * 2 : BORDER_THICKNESS);
    return hasToggle ? marginLeft - TOGGLE_BUTTON_WIDTH : marginLeft;
  }

  const content = (
    <>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events */}
      <div
        css={css`
          border-bottom: ${euiTheme.border.thin};
          ${onClick || hasToggle ? 'cursor: pointer;' : 'cursor: default'}
        `}
        onClick={(e: React.MouseEvent) => {
          if (!hasToggle && onClick) {
            e.stopPropagation();
            onClick(item.id);
          }
        }}
      >
        <EuiFlexGroup
          gutterSize="none"
          data-test-subj="trace-item-container"
          css={css`
          margin-left: ${accordionIndent}px;
          margin-right: ${margin.right}px;
          border-left: ${
            item.hasError
              ? `${euiTheme.border.width.thick} solid ${euiTheme.colors.danger};`
              : `${euiTheme.border.thin};`
          }
          padding: 6px 0;
          ${isHighlighted ? `background-color: ${euiTheme.colors.lightestShade};` : undefined}
          &:hover {
            background-color: ${euiTheme.colors.lightestShade};
          }
        `}
        >
          {hasToggle ? (
            <EuiFlexItem grow={false}>
              <ToggleAccordionButton
                isOpen={state === 'open'}
                childrenCount={childrenCount}
                onClick={() => onToggle(item.id)}
              />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem>
            <div
              data-test-subj="trace-bar-row"
              css={css`
                margin-left: ${calculateMarginLeft()}px;
              `}
              onClick={(e: React.MouseEvent) => {
                if (hasToggle && onClick) {
                  e.stopPropagation();
                  onClick(item.id);
                }
              }}
              onKeyDown={(e) => {
                if (onClick && (e.key === 'Enter' || e.key === ' ')) {
                  // Ignore event if it comes from a link
                  if (e.target instanceof HTMLAnchorElement) {
                    return;
                  }
                  e.preventDefault(); // Prevent scroll if Space is pressed
                  onClick(item.id);
                }
              }}
              tabIndex={onClick ? 0 : -1}
              role={onClick ? 'button' : undefined}
              aria-label={
                onClick
                  ? i18n.translate('xpack.apm.traceItemRow.openDetailsButton', {
                      defaultMessage: 'View details for {name}',
                      values: { name: item.name },
                    })
                  : undefined
              }
            >
              <Bar width={widthPercent} left={leftPercent} color={item.color} />
              <BarDetails item={item} left={leftPercent} onErrorClick={onErrorClick} />
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </>
  );

  if (!showAccordion) {
    return <>{content}</>;
  }

  return (
    <>
      <EuiAccordion
        id={item.id}
        buttonContent={content}
        paddingSize="none"
        forceState={state}
        arrowDisplay="none"
        onToggle={() => {
          if (hasToggle) {
            onToggle(item.id);
          }
        }}
        buttonContentClassName="accordion__buttonContent"
        css={css`
          .accordion__buttonContent {
            width: 100%;
          }
        `}
      />
    </>
  );
}
