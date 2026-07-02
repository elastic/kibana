/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import { css } from '@emotion/react';
import {
  SignificantEventItem,
  type SignificantEventItemPlacement,
  type SignificantEventItemStatus,
} from '../significant_event_item/significant_event_item';

/**
 * Width cap for the list as specified in the design. The list still
 * fills the available width up to this value, so it behaves correctly
 * in narrower layouts (it never overflows the container).
 */
const DEFAULT_MAX_WIDTH = 760;

/**
 * Soft upper bound on the number of items the list is designed to
 * render without virtualization. In development a `console.warn` is
 * emitted past this threshold so consumers know they may need to
 * paginate or virtualize. The list still renders all items — this is
 * a hint, not a limit.
 */
const SOFT_MAX_ITEMS = 20;

export interface SignificantEventListItem {
  /** Stable unique id used for selection and React keys. */
  id: string;
  /** Bolded headline rendered on the row. */
  title: string;
  /** Short body copy next to the title. Maps to `SigEvent.summary`. */
  summary: string;
  /**
   * Detection time as an ISO 8601 string or a `Date`. The item
   * formats this to relative time ("15 minutes ago") by default.
   */
  detectedAt: string | Date;
  /** Status indicator (color + label). */
  status: SignificantEventItemStatus;
}

export interface SignificantEventListProps {
  /**
   * Ordered list of events to render. The list assigns `placement`
   * automatically (single / top / middle×N / bottom) so the items
   * visually fuse into one grouped surface.
   *
   * The list is designed for up to ~20 items at a time. Above that,
   * consumers should paginate or virtualize; a dev-only console
   * warning fires past `SOFT_MAX_ITEMS`.
   */
  items: SignificantEventListItem[];
  /**
   * Controlled single-selection model. Pass `null` (or omit) for no
   * selection. Pair with `onSelect` to toggle.
   */
  selectedId?: string | null;
  /**
   * Called when an item is clicked. Receives the id, or `null` if the
   * currently selected item is being deselected.
   */
  onSelect?: (id: string | null) => void;
  /**
   * Id of the flyout / panel the rows toggle. Forwarded to every
   * item's `controls` prop so `aria-controls` is set when present.
   */
  controls?: string;
  /**
   * When provided, renders the "Start a chat" action on each item.
   * Receives the event id.
   */
  onStartChat?: (id: string) => void;
  /**
   * Label rendered on every item's "Start a chat" button. Pass an
   * already translated string. Defaults to the item's own English
   * default.
   */
  startChatLabel?: string;
  /**
   * When provided, renders the overflow-menu icon on each item.
   * Receives the event id and the triggering element (anchor for
   * `EuiPopover`).
   */
  onMoreClick?: (id: string, target: HTMLElement) => void;
  /**
   * Accessible label for every item's overflow-menu icon button.
   * Pass an already translated string.
   */
  moreActionsAriaLabel?: string;
  /**
   * Forwarded to every item so consumers can override the relative
   * time formatter once for the whole list.
   */
  formatDetectedAt?: (detectedAt: string | Date) => React.ReactNode;
  /** Pixel cap on the list width. Defaults to 760. */
  maxWidth?: number;
  /** Test subject hook. Defaults to `"significantEventList"`. */
  'data-test-subj'?: string;
}

/**
 * Computes the stacking placement for an item at `index` within a list
 * of `total` items. Internal implementation detail — not part of the
 * package's public API.
 */
function getItemPlacement(index: number, total: number): SignificantEventItemPlacement {
  if (total === 1) return 'single';
  if (index === 0) return 'top';
  if (index === total - 1) return 'bottom';
  return 'middle';
}

const listStyles = (maxWidth: number) => css`
  width: 100%;
  max-width: ${maxWidth}px;
`;

/**
 * `SignificantEventList` stacks one or more `SignificantEventItem`s
 * into a single grouped surface. It owns:
 * - placement assignment (corner radii / border merging),
 * - the single-selection toggle (clicking the selected item deselects),
 * - max-width clamping (default 760px),
 * - a dev-time warning when the soft item limit is exceeded.
 *
 * Everything visual lives in `SignificantEventItem`; this component is
 * pure composition.
 */
export function SignificantEventList({
  items,
  selectedId = null,
  onSelect,
  controls,
  onStartChat,
  startChatLabel,
  onMoreClick,
  moreActionsAriaLabel,
  formatDetectedAt,
  maxWidth = DEFAULT_MAX_WIDTH,
  'data-test-subj': dataTestSubj = 'significantEventList',
}: SignificantEventListProps) {
  const handleSelect = useCallback(
    (id: string) => {
      if (!onSelect) return;
      onSelect(selectedId === id ? null : id);
    },
    [onSelect, selectedId]
  );

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && items.length > SOFT_MAX_ITEMS) {
      // eslint-disable-next-line no-console
      console.warn(
        `[SignificantEventList] Rendering ${items.length} items exceeds the soft limit of ${SOFT_MAX_ITEMS}. ` +
          'Consider pagination or virtualization for large lists.'
      );
    }
  }, [items.length]);

  if (items.length === 0) return null;

  return (
    <div css={listStyles(maxWidth)} data-test-subj={dataTestSubj}>
      {items.map((item, index) => (
        <SignificantEventItem
          key={item.id}
          title={item.title}
          summary={item.summary}
          detectedAt={item.detectedAt}
          formatDetectedAt={formatDetectedAt}
          status={item.status}
          placement={getItemPlacement(index, items.length)}
          selected={selectedId === item.id}
          controls={controls}
          onClick={onSelect ? () => handleSelect(item.id) : undefined}
          onStartChat={onStartChat ? () => onStartChat(item.id) : undefined}
          startChatLabel={startChatLabel}
          onMoreClick={onMoreClick ? (target) => onMoreClick(item.id, target) : undefined}
          moreActionsAriaLabel={moreActionsAriaLabel}
          data-test-subj={`${dataTestSubj}-item-${item.id}`}
        />
      ))}
    </div>
  );
}
