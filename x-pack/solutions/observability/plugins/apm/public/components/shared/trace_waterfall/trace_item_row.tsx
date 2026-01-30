/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiAccordionProps } from '@elastic/eui';
import { EuiAccordion, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { transparentize } from 'polished';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { CriticalPathSegment } from './critical_path';
import { Bar, type BarSegment } from './bar';
import { BarDetails } from './bar_details';
import { TOGGLE_BUTTON_WIDTH, ToggleAccordionButton } from './toggle_accordion_button';
import { useTraceWaterfallContext } from './trace_waterfall_context';
import type { TraceWaterfallItem } from './use_trace_waterfall';
import { isFailureOrError } from './utils/is_failure_or_error';

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
  const {
    duration,
    margin,
    showAccordion,
    onClick,
    highlightedTraceId,
    criticalPathSegmentsById,
    showCriticalPath,
  } = useTraceWaterfallContext();
  const isHighlighted = highlightedTraceId === item.id;
  const widthPercent = (item.duration / duration) * 100;
  const leftPercent = ((item.offset + item.skew) / duration) * 100;
  const hasToggle = showAccordion && childrenCount > 0;
  const accordionIndent = ACCORDION_PADDING_LEFT * item.depth;
  const { euiTheme } = useEuiTheme();
  const itemStatusIsFailureOrError = isFailureOrError(item.status?.value);

  const displayedColor = showCriticalPath ? transparentize(0.5, item.color) : item.color;

  const segments = getCriticalPathOverlays(
    criticalPathSegmentsById[item.id],
    item,
    euiTheme.colors.accent
  );

  function calculateMarginLeft() {
    const marginLeft =
      margin.left -
      accordionIndent -
      (itemStatusIsFailureOrError ? BORDER_THICKNESS * 2 : BORDER_THICKNESS);
    return hasToggle ? marginLeft - TOGGLE_BUTTON_WIDTH : marginLeft;
  }

  const content = (
    <>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events */}
      <div
        data-test-subj="traceItemRowWrapper"
        css={css`
          border-bottom: ${euiTheme.border.thin};
          ${onClick || hasToggle ? 'cursor: pointer;' : 'cursor: default'}
        `}
        onClick={() => {
          if (!hasToggle && onClick) {
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
            itemStatusIsFailureOrError
              ? `${euiTheme.border.width.thick} solid ${euiTheme.colors.danger};`
              : `${euiTheme.border.thin};`
          }
          padding: 6px 0;
          ${isHighlighted ? `background-color: ${euiTheme.colors.lightestShade};` : undefined}
          ${
            !highlightedTraceId &&
            ` &:hover {
            background-color: ${euiTheme.colors.lightestShade};
          }`
          }
        `}
        >
          {hasToggle ? (
            <EuiFlexItem grow={false}>
              <ToggleAccordionButton
                data-test-subj="traceItemRowToggleAccordionButton"
                isOpen={state === 'open'}
                childrenCount={childrenCount}
                onClick={() => onToggle(item.id)}
              />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem>
            <div
              data-test-subj="traceItemRowContent"
              css={css`
                margin-left: ${calculateMarginLeft()}px;
              `}
              onClick={() => {
                if (hasToggle && onClick) {
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
              <Bar
                width={widthPercent}
                left={leftPercent}
                color={displayedColor}
                segments={segments}
                duration={item.duration}
                composite={item.composite}
              />
              <BarDetails item={item} left={leftPercent} />
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
        buttonElement="div"
        buttonContent={content}
        paddingSize="none"
        forceState={state}
        arrowDisplay="none"
        arrowProps={{
          // EUI forces arrow display when buttonElement="div" for accessibility.
          // Hide it since we use custom ToggleAccordionButton with role="button" and tabIndex.
          css: css`
            display: none;
          `,
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

/**
 * Converts critical path segments into visual overlay segments for rendering in the waterfall bar.
 *
 * This function:
 * 1. Filters segments to only include "self" segments (active contribution to critical path)
 * 2. Calculates relative positioning within the item's duration
 * 3. Returns segments ready for rendering as overlays
 */
export function getCriticalPathOverlays(
  segments: CriticalPathSegment<TraceWaterfallItem>[] | undefined,
  item: TraceWaterfallItem,
  color: string
): BarSegment[] | undefined {
  return segments
    ?.filter((segment) => segment.self)
    .map((segment) => ({
      id: segment.item.id,
      color,
      left: (segment.offset - item.offset - item.skew) / item.duration,
      width: segment.duration / item.duration,
    }));
}
