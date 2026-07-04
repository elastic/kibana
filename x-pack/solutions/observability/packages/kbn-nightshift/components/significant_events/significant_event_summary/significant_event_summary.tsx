/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAvatar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiStat,
  useEuiTheme,
  type UseEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

/**
 * The four fixed buckets the Nightshift summary surfaces. The order
 * matches the visual order (left → right) in the design.
 *
 * Mapping to `SigEventStatus` (`@kbn/streams-schema`):
 * - `requireAction` ↔ `promoted`
 * - `inProgress`    ↔ `acknowledged`
 * - `resolved`      ↔ `resolved`
 * - `demoted`       ↔ `demoted`
 *
 * Exported (previously internal-only) so consumers can pass `visibleCategories`
 * — e.g. the v0 Nightshift landing page only shows `requireAction`/`resolved`
 * per the 2026-07-02 design decision to hide `acknowledged`/`demoted` from users
 * for now. Defaults to all four so this is additive, not a behavior change.
 */
export type SignificantEventSummaryCategory = 'requireAction' | 'inProgress' | 'resolved' | 'demoted';

const ALL_CATEGORIES: SignificantEventSummaryCategory[] = [
  'requireAction',
  'inProgress',
  'resolved',
  'demoted',
];

export interface SignificantEventSummaryProps {
  /** Count of events requiring action (maps to `promoted` status). */
  requireAction: number;
  /** Count of events being investigated (maps to `acknowledged` status). */
  inProgress: number;
  /** Count of events that have been resolved (maps to `resolved` status). */
  resolved: number;
  /** Count of events that have been demoted (maps to `demoted` status). */
  demoted: number;
  /**
   * Which of the four buckets to render, in this order. Defaults to all
   * four. Pass a subset (e.g. `['requireAction', 'resolved']`) to hide the
   * others without changing how counts are computed by the caller.
   */
  visibleCategories?: SignificantEventSummaryCategory[];
  /**
   * When provided, each card becomes a toggle button (Kate Sosedova's
   * prototype uses the summary cards as an active filter for the list
   * below, not just a static count) and calls back with the clicked
   * category's id. Omit to keep the original read-only behavior.
   */
  onCategoryClick?: (category: SignificantEventSummaryCategory) => void;
  /** When `onCategoryClick` is set, which category (if any) is currently active/selected. */
  activeCategory?: SignificantEventSummaryCategory;
  /** Test subject hook. Defaults to `"significantEventSummary"`. */
  'data-test-subj'?: string;
}

const AVATAR_SIZE_PX = 24;

const labels = {
  requireAction: i18n.translate('xpack.nightshift.significantEventSummary.requireAction', {
    defaultMessage: 'Require action',
  }),
  inProgress: i18n.translate('xpack.nightshift.significantEventSummary.inProgress', {
    defaultMessage: 'In progress',
  }),
  resolved: i18n.translate('xpack.nightshift.significantEventSummary.resolved', {
    defaultMessage: 'Resolved',
  }),
  demoted: i18n.translate('xpack.nightshift.significantEventSummary.demoted', {
    defaultMessage: 'Demoted',
  }),
};

/**
 * "In progress" avatar.
 * - When `count > 0`, renders an animated `EuiLoadingSpinner` inside a
 *   warning-tinted circle to convey "work happening right now".
 * - When `count === 0`, renders a static `EuiAvatar` with the
 *   `dashedCircle` icon so we don't animate / spin a "0 in progress"
 *   indicator (visually misleading and a small forever-CPU cost).
 *
 * `EuiAvatar` does not accept children, so the spinning variant is a
 * tiny custom wrapper to keep the visual rhythm with the other cards.
 */
function InProgressAvatar({
  count,
  euiThemeContext,
}: {
  count: number;
  euiThemeContext: UseEuiTheme;
}) {
  const { euiTheme } = euiThemeContext;

  if (count === 0) {
    return (
      <EuiAvatar
        size="s"
        name={labels.inProgress}
        iconType="dashedCircle"
        iconColor={euiTheme.colors.textSubdued}
        color={euiTheme.colors.backgroundBaseSubdued}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      css={css`
        width: ${AVATAR_SIZE_PX}px;
        height: ${AVATAR_SIZE_PX}px;
        border-radius: 50%;
        background-color: ${euiTheme.colors.backgroundBaseWarning};
        display: inline-flex;
        align-items: center;
        justify-content: center;
      `}
    >
      <EuiLoadingSpinner size="m" />
    </div>
  );
}

interface CategoryConfig {
  id: SignificantEventSummaryCategory;
  label: string;
  value: number;
  renderAvatar: () => React.ReactNode;
}

/**
 * `SignificantEventSummary` renders the four fixed Nightshift status
 * buckets as a row of `EuiStat` cards with leading avatars. It's a
 * pragmatic, opinionated summary component — engineers pass four
 * counts; we own the labels, icons and layout.
 *
 * Read-only / display-only (no click handling). Cards wrap to a new
 * row on narrow viewports via `EuiFlexGroup responsive`.
 */
export function SignificantEventSummary({
  requireAction,
  inProgress,
  resolved,
  demoted,
  visibleCategories = ALL_CATEGORIES,
  onCategoryClick,
  activeCategory,
  'data-test-subj': dataTestSubj = 'significantEventSummary',
}: SignificantEventSummaryProps) {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;

  /*
   * Not memoized: the array is 4 items, all closures depend on every
   * `euiTheme` field, and `useMemo` would only paper over the inline
   * closure churn while adding maintenance overhead.
   */
  const categories: CategoryConfig[] = [
    {
      id: 'requireAction',
      label: labels.requireAction,
      value: requireAction,
      renderAvatar: () => (
        <EuiAvatar
          size="s"
          name={labels.requireAction}
          iconType="radar"
          iconColor={euiTheme.colors.textDanger}
          color={euiTheme.colors.backgroundBaseDanger}
        />
      ),
    },
    {
      id: 'inProgress',
      label: labels.inProgress,
      value: inProgress,
      renderAvatar: () => <InProgressAvatar count={inProgress} euiThemeContext={euiThemeContext} />,
    },
    {
      id: 'resolved',
      label: labels.resolved,
      value: resolved,
      renderAvatar: () => (
        <EuiAvatar
          size="s"
          name={labels.resolved}
          iconType="checkInCircleFilled"
          iconColor={euiTheme.colors.textSuccess}
          color={euiTheme.colors.backgroundBaseSuccess}
        />
      ),
    },
    {
      id: 'demoted',
      label: labels.demoted,
      value: demoted,
      renderAvatar: () => (
        <EuiAvatar
          size="s"
          name={labels.demoted}
          iconType="archive"
          iconColor={euiTheme.colors.textSubdued}
          color={euiTheme.colors.backgroundBaseSubdued}
        />
      ),
    },
  ];

  const visibleCategoryConfigs = categories.filter((category) =>
    visibleCategories.includes(category.id)
  );

  return (
    <EuiFlexGroup gutterSize="s" responsive={true} data-test-subj={dataTestSubj}>
      {visibleCategoryConfigs.map((category) => {
        const isClickable = Boolean(onCategoryClick);
        const isActive = isClickable && activeCategory === category.id;
        return (
          <EuiFlexItem key={category.id}>
            <EuiPanel
              hasBorder
              paddingSize="s"
              data-test-subj={`${dataTestSubj}-${category.id}`}
              onClick={isClickable ? () => onCategoryClick!(category.id) : undefined}
              color={isActive ? 'subdued' : 'plain'}
              css={isClickable ? { cursor: 'pointer' } : undefined}
            >
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>{category.renderAvatar()}</EuiFlexItem>
                <EuiFlexItem grow={true}>
                  <EuiStat
                    title={category.value}
                    description={category.label}
                    titleSize="xs"
                    textAlign="left"
                    data-test-subj={`${dataTestSubj}-${category.id}-stat`}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
}
