/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, type MouseEvent } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiIcon,
  EuiSkeletonRectangle,
  EuiSkeletonText,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
  type UseEuiTheme,
} from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import { css } from '@emotion/react';

/**
 * Stacking position of a `SignificantEventItem` within a vertical list.
 * Controls which corners are rounded so adjacent items visually fuse
 * into a single grouped surface.
 *
 * - `single`: all four corners rounded (item rendered standalone).
 * - `top`: top-left + top-right rounded.
 * - `middle`: no corners rounded (and the top border is suppressed
 *   so adjacent items don't render a double 1px line).
 * - `bottom`: bottom-left + bottom-right rounded (top border suppressed).
 *
 * Consumers rendering a single `SignificantEventItem` should leave this
 * unset (defaults to `'single'`). When the item is rendered inside
 * `SignificantEventList`, the list overrides this per-item.
 */
export type SignificantEventItemPlacement = 'single' | 'top' | 'middle' | 'bottom';

/**
 * Constrained EUI semantic color name accepted by the status pill.
 * Restricting to this union (rather than `string`) keeps the design
 * language coherent across consumers — no hex / freeform colors.
 */
export type SignificantEventItemStatusColor =
  | 'primary'
  | 'success'
  | 'accent'
  | 'warning'
  | 'danger'
  | 'subdued';

/**
 * Status pill rendered as part of the meta row. Uses `EuiHealth`
 * (colored dot + label).
 */
export interface SignificantEventItemStatus {
  /** Human-readable label (already translated by the caller). */
  label: string;
  /** EuiHealth color — restricted to EUI semantic names for theme awareness. */
  color: SignificantEventItemStatusColor;
}

export interface SignificantEventItemProps {
  /** Bolded link-styled headline (e.g. event title). */
  title: string;
  /**
   * Short body copy rendered next to the timestamp and status. Maps to
   * the `summary` field of `SigEvent` (`@kbn/streams-schema`).
   */
  summary: string;
  /**
   * Detection time as an ISO 8601 string or a `Date`. Rendered with
   * `FormattedRelative` from `@kbn/i18n-react`, which produces an
   * auto-updating localized "X minutes ago" string. Use
   * `formatDetectedAt` to render something else (absolute date, custom
   * tooltip, etc.).
   */
  detectedAt: string | Date;
  /**
   * Optional render override for the timestamp. Receives the raw value
   * passed to `detectedAt`. Return any `ReactNode` — a string, a
   * `FormattedDate`, a tooltip-wrapped span, anything. When omitted,
   * `<FormattedRelative />` is used.
   */
  formatDetectedAt?: (detectedAt: string | Date) => React.ReactNode;
  /** Status indicator. */
  status: SignificantEventItemStatus;
  /**
   * Stacking position. Defaults to `'single'`. When used inside
   * `SignificantEventList`, the list overrides this per-item.
   */
  placement?: SignificantEventItemPlacement;
  /**
   * Controlled selected/expanded state. When `true`:
   * - background uses `colors.backgroundBasePrimary`,
   * - the left icon switches from "expand" to "minimize",
   * - the right-side action buttons (if any) are always visible,
   * - `aria-expanded` on the trigger becomes `true`.
   */
  selected?: boolean;
  /**
   * Click handler fired by the row trigger (mouse + native keyboard
   * activation on the underlying `<button>`). When omitted the row is
   * non-interactive.
   */
  onClick?: () => void;
  /**
   * Id of the flyout / panel that this row toggles. When provided,
   * wired up as `aria-controls` on the trigger button so screen
   * readers can announce the disclosure relationship.
   */
  controls?: string;
  /**
   * When provided, renders a "Start a chat" `EuiButtonEmpty` revealed
   * on hover / focus-within / selected.
   */
  onStartChat?: () => void;
  /**
   * Label rendered on the "Start a chat" button. Pass an already
   * translated string. Defaults to `"Start a chat"` (English) — the
   * default exists so stories work out of the box; production
   * consumers should always supply a translated label.
   */
  startChatLabel?: string;
  /**
   * When provided, renders a vertical-dots icon button revealed on
   * hover / focus-within / selected. Receives the triggering element
   * so callers can anchor an `EuiPopover`.
   */
  onMoreClick?: (target: HTMLElement) => void;
  /**
   * Accessible label for the overflow icon button. Pass an already
   * translated string. Defaults to `"More actions"` (English) — same
   * caveat as `startChatLabel`.
   */
  moreActionsAriaLabel?: string;
  /**
   * Renders a skeleton placeholder in place of the row content. Title,
   * summary, timestamp and status are replaced with `EuiSkeletonText`
   * blocks that match their dimensions. Action buttons are not rendered
   * while loading.
   */
  loading?: boolean;
  /** Test subject hook. Defaults to `"significantEventItem"`. */
  'data-test-subj'?: string;
}

const ITEM_MIN_HEIGHT = 74;

/**
 * Stable class names used for cross-element CSS rules (hover-reveal of
 * the actions container). Stable, scoped names avoid relying on
 * Emotion-generated hashes or arbitrary `data-*` attributes that a
 * consumer might accidentally set.
 */
const ROW_CONTAINER_CLASS_NAME = 'kbnNightshiftSigEventRow';
const ROW_ACTIONS_CLASS_NAME = 'kbnNightshiftSigEventRow__actions';

const DEFAULT_START_CHAT_LABEL = 'Start a chat';
const DEFAULT_MORE_ACTIONS_LABEL = 'More actions';

const containerStyles = (
  { euiTheme }: UseEuiTheme,
  placement: SignificantEventItemPlacement,
  selected: boolean,
  interactive: boolean
) => {
  const isTop = placement === 'top' || placement === 'single';
  const isBottom = placement === 'bottom' || placement === 'single';
  const suppressTopBorder = placement === 'middle' || placement === 'bottom';
  const radius = euiTheme.border.radius.medium;

  const background = selected
    ? euiTheme.colors.backgroundBasePrimary
    : euiTheme.colors.backgroundBasePlain;

  return css`
    /*
     * Row layout is flex-wrap so the right-side actions can drop to a
     * new line on very narrow widths instead of crowding the trigger.
     * The trigger always takes the first line and is allowed to
     * shrink down to 200px before the actions wrap.
     */
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    column-gap: ${euiTheme.size.s};
    row-gap: ${euiTheme.size.xs};
    width: 100%;
    min-height: ${ITEM_MIN_HEIGHT}px;
    padding: ${euiTheme.size.m};
    background-color: ${background};
    border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};
    ${suppressTopBorder && `border-top-width: 0;`}
    border-top-left-radius: ${isTop ? radius : '0'};
    border-top-right-radius: ${isTop ? radius : '0'};
    border-bottom-left-radius: ${isBottom ? radius : '0'};
    border-bottom-right-radius: ${isBottom ? radius : '0'};
    text-align: left;
    transition: background-color ${euiTheme.animation.fast} ${euiTheme.animation.resistance};

    ${interactive &&
    css`
      &:hover {
        background-color: ${selected
          ? euiTheme.colors.backgroundBasePrimary
          : euiTheme.colors.backgroundBaseSubdued};
      }
    `}

    /*
     * Reveal the right-side actions on hover and when any descendant
     * has keyboard focus (so the chat / overflow buttons become
     * focusable via tab). Scoped to our own stable class name to
     * avoid coupling to incidental DOM structure.
     */
    &:hover .${ROW_ACTIONS_CLASS_NAME},
    &:focus-within .${ROW_ACTIONS_CLASS_NAME} {
      opacity: 1;
      pointer-events: auto;
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `;
};

/**
 * Real `<button>` (per EUI guidance — no `<div role="button">`). The
 * button is laid out as a flex row that holds the left icon and the
 * title/meta column, and is sized to take all the available row
 * width minus the actions slot.
 */
const triggerButtonStyles = ({ euiTheme }: UseEuiTheme) => css`
  /* button reset */
  background: transparent;
  border: 0;
  padding: 0;
  margin: 0;
  font: inherit;
  color: inherit;
  text-align: left;
  appearance: none;
  cursor: pointer;

  /* layout */
  display: flex;
  align-items: center;
  gap: ${euiTheme.size.s};
  flex: 1 1 200px;
  min-width: 0;

  &:focus-visible {
    outline: ${euiTheme.focus.width} solid ${euiTheme.colors.borderStrongPrimary};
    outline-offset: ${euiTheme.size.xxs};
    border-radius: ${euiTheme.border.radius.medium};
  }
`;

/** Non-interactive variant — same layout, no button reset. */
const triggerDivStyles = ({ euiTheme }: UseEuiTheme) => css`
  display: flex;
  align-items: center;
  gap: ${euiTheme.size.s};
  flex: 1 1 200px;
  min-width: 0;
`;

/**
 * Right-side actions container. Sibling of the trigger button (NOT a
 * child) so the chat / overflow buttons are not nested interactive
 * elements inside the row's button surface.
 *
 * Hidden by default (`opacity: 0; pointer-events: none;`) and revealed
 * via the parent container's `:hover` / `:focus-within` selectors
 * (see `containerStyles`). Always visible when `selected`.
 *
 * `margin-left: auto` pushes the actions to the right edge on wide
 * rows AND keeps them right-aligned when they wrap to a new line on
 * narrow viewports.
 */
const actionsStyles = ({ euiTheme }: UseEuiTheme, selected: boolean) => css`
  display: flex;
  align-items: center;
  gap: ${euiTheme.size.xs};
  margin-left: auto;
  flex-shrink: 0;
  opacity: ${selected ? 1 : 0};
  pointer-events: ${selected ? 'auto' : 'none'};
  transition: opacity ${euiTheme.animation.fast} ${euiTheme.animation.resistance};

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

/**
 * Title rendered as `<h6>` (EUI's smallest heading) using `EuiTitle
 * size="xxxs"`. We override two things on top of the EUI default:
 * - color to `textPrimary` (primary link color) so the row reads as
 *   something openable, like a link,
 * - weight to `semiBold` per the Nightshift design spec.
 *
 * The doubled `&&` selector raises specificity so our color wins
 * against `EuiTitle`'s built-in heading color rule.
 */
const titleStyles = ({ euiTheme }: UseEuiTheme) => css`
  && {
    color: ${euiTheme.colors.textPrimary};
    font-weight: ${euiTheme.font.weight.semiBold};
  }
`;

/**
 * Summary, timestamp and the bullet separator all share the same
 * subdued text treatment so the bottom row reads as one piece of meta
 * information. Sized to `xs` to match `EuiHealth textSize="xs"`.
 */
const metaTextStyles = ({ euiTheme }: UseEuiTheme) => css`
  color: ${euiTheme.colors.textSubdued};
`;

const dotStyles = ({ euiTheme }: UseEuiTheme) => css`
  color: ${euiTheme.colors.textSubdued};
  user-select: none;
`;

/**
 * Title + meta column. `min-width: 0` lets the inner meta row wrap
 * inside instead of forcing horizontal overflow.
 */
const leftContentStyles = ({ euiTheme }: UseEuiTheme) => css`
  display: flex;
  flex-direction: column;
  gap: ${euiTheme.size.xs};
  min-width: 0;
  flex: 1 1 auto;
`;

/**
 * `SignificantEventItem` is the row primitive for the Nightshift
 * "significant events" surface. It is presentational and fully
 * controlled — the parent owns `selected` state and supplies callbacks
 * for click, "Start a chat" and the overflow menu.
 *
 * The row is composed of two sibling elements inside a layout
 * container:
 * 1. The trigger `<button>` (or `<div>` when non-interactive) that
 *    holds the left icon + title + meta.
 * 2. The actions container (chat + overflow), revealed on
 *    hover / focus-within / when selected.
 *
 * Keeping the action buttons as siblings — not children of the
 * trigger button — avoids nested interactive elements in the ARIA
 * tree.
 *
 * Composition: stack multiple items by wrapping in
 * `SignificantEventList`, which assigns the correct `placement` to each
 * item so the radii and borders fuse into a single grouped surface.
 */
export function SignificantEventItem({
  title,
  summary,
  detectedAt,
  formatDetectedAt,
  status,
  placement = 'single',
  selected = false,
  controls,
  onClick,
  onStartChat,
  startChatLabel = DEFAULT_START_CHAT_LABEL,
  onMoreClick,
  moreActionsAriaLabel = DEFAULT_MORE_ACTIONS_LABEL,
  loading = false,
  'data-test-subj': dataTestSubj = 'significantEventItem',
}: SignificantEventItemProps) {
  const euiThemeContext = useEuiTheme();
  const interactive = !loading && typeof onClick === 'function';
  const titleId = useGeneratedHtmlId({ prefix: 'kbnNightshiftSigEventTitle' });

  const handleMoreClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      onMoreClick?.(event.currentTarget);
    },
    [onMoreClick]
  );

  const detectedAtNode = formatDetectedAt ? (
    formatDetectedAt(detectedAt)
  ) : (
    <FormattedRelative value={detectedAt} updateIntervalInSeconds={30} />
  );

  const triggerContent = loading ? (
    <>
      <EuiSkeletonRectangle width={16} height={16} borderRadius="s" />
      <div css={leftContentStyles(euiThemeContext)}>
        <EuiSkeletonText lines={1} size="s" />
        <EuiSkeletonText lines={1} size="xs" />
      </div>
    </>
  ) : (
    <>
      {/*
       * Left icon is purely visual: it reflects the row's selected
       * state (`expand` -> `minimize`) but is NOT a separate
       * interactive element.
       */}
      <EuiIcon
        type={selected ? 'minimize' : 'expand'}
        color="subdued"
        data-test-subj={`${dataTestSubj}-leftIcon`}
      />

      <div css={leftContentStyles(euiThemeContext)}>
        <EuiTitle size="xxxs">
          <h6 id={titleId} css={titleStyles(euiThemeContext)}>
            {title}
          </h6>
        </EuiTitle>

        {/*
         * Summary, timestamp and status share one row. They are flex
         * items so they wrap to a new line as soon as horizontal
         * space runs out.
         */}
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" css={metaTextStyles(euiThemeContext)}>
              {summary}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <span aria-hidden="true" css={dotStyles(euiThemeContext)}>
              •
            </span>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" css={metaTextStyles(euiThemeContext)}>
              {detectedAtNode}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <span aria-hidden="true" css={dotStyles(euiThemeContext)}>
              •
            </span>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiHealth color={status.color} textSize="xs">
              {status.label}
            </EuiHealth>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </>
  );

  return (
    <div
      className={ROW_CONTAINER_CLASS_NAME}
      css={containerStyles(euiThemeContext, placement, selected, interactive)}
      data-test-subj={loading ? `${dataTestSubj}-skeleton` : dataTestSubj}
    >
      {interactive ? (
        <button
          type="button"
          css={triggerButtonStyles(euiThemeContext)}
          onClick={onClick}
          aria-labelledby={titleId}
          aria-expanded={selected}
          aria-controls={controls}
          data-test-subj={`${dataTestSubj}-trigger`}
        >
          {triggerContent}
        </button>
      ) : (
        <div css={triggerDivStyles(euiThemeContext)} data-test-subj={`${dataTestSubj}-trigger`}>
          {triggerContent}
        </div>
      )}

      {!loading && (onStartChat || onMoreClick) && (
        <div className={ROW_ACTIONS_CLASS_NAME} css={actionsStyles(euiThemeContext, selected)}>
          {onStartChat && (
            <EuiButtonEmpty
              size="xs"
              onClick={onStartChat}
              data-test-subj={`${dataTestSubj}-startChat`}
            >
              {startChatLabel}
            </EuiButtonEmpty>
          )}
          {onMoreClick && (
            <EuiButtonIcon
              iconType="boxesVertical"
              aria-label={moreActionsAriaLabel}
              color="text"
              size="xs"
              onClick={handleMoreClick}
              data-test-subj={`${dataTestSubj}-more`}
            />
          )}
        </div>
      )}
    </div>
  );
}
