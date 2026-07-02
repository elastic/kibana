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
 * matches the visual order (left → right) in the design. Kept internal
 * because the component is presentation-only — consumers don't need to
 * reference category ids from the outside.
 *
 * Mapping to `SigEventStatus` (`@kbn/streams-schema`):
 * - `requireAction` ↔ `promoted`
 * - `inProgress`    ↔ `acknowledged`
 * - `resolved`      ↔ `resolved`
 * - `demoted`       ↔ `demoted`
 */
type SignificantEventSummaryCategory = 'requireAction' | 'inProgress' | 'resolved' | 'demoted';

export interface SignificantEventSummaryProps {
  /** Count of events requiring action (maps to `promoted` status). */
  requireAction: number;
  /** Count of events being investigated (maps to `acknowledged` status). */
  inProgress: number;
  /** Count of events that have been resolved (maps to `resolved` status). */
  resolved: number;
  /** Count of events that have been demoted (maps to `demoted` status). */
  demoted: number;
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

  return (
    <EuiFlexGroup gutterSize="s" responsive={true} data-test-subj={dataTestSubj}>
      {categories.map((category) => (
        <EuiFlexItem key={category.id}>
          <EuiPanel hasBorder paddingSize="s" data-test-subj={`${dataTestSubj}-${category.id}`}>
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
      ))}
    </EuiFlexGroup>
  );
}
