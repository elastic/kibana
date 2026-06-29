/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, useEuiTheme, type UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

/**
 * Spec-mandated card dimensions. These are the only two non-token literals
 * in the component — every other dimension, color, radius and easing is
 * resolved from `useEuiTheme()`.
 */
const CARD_HEIGHT = 58;
const CARD_MIN_WIDTH = 170;

export interface MetadataKICardProps {
  /**
   * Short category label rendered above the name
   * (e.g. `"Service"`, `"Dependency"`, `"Infrastructure"`).
   *
   * Already-translated string; the card does not translate it.
   */
  subtype: string;
  /**
   * Primary identifier rendered below the subtype (e.g. `"payment"`,
   * `"checkout → payment"`). Already-translated / formatted string.
   */
  name: string;
  /**
   * Visual selected state. The default (`false`) uses the subtle danger
   * background; `true` uses the lighter danger background plus a strong
   * danger border. Selection state is controlled — pair with `onClick`.
   */
  selected?: boolean;
  /**
   * When provided, the card renders as an interactive `<button>` with
   * hover, focus-visible and keyboard activation. When omitted the card
   * renders as a non-interactive `<div>` (read-only).
   */
  onClick?: () => void;
  /**
   * Test subject hook. Defaults to `"metadataKICard"`.
   */
  'data-test-subj'?: string;
}

const cardStyles = ({ euiTheme }: UseEuiTheme, selected: boolean, interactive: boolean) => {
  const background = selected
    ? euiTheme.colors.backgroundLightDanger
    : euiTheme.colors.backgroundBaseDanger;
  const borderColor = selected ? euiTheme.colors.borderStrongDanger : 'transparent';

  return css`
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: ${euiTheme.size.xxs};
    height: ${CARD_HEIGHT}px;
    min-width: ${CARD_MIN_WIDTH}px;
    padding: ${euiTheme.size.s} ${euiTheme.size.m};
    background-color: ${background};
    border: ${euiTheme.border.width.thin} solid ${borderColor};
    border-radius: ${euiTheme.border.radius.medium};
    color: ${euiTheme.colors.textDanger};
    text-align: left;
    appearance: none;
    transition: background-color ${euiTheme.animation.fast} ${euiTheme.animation.resistance},
      border-color ${euiTheme.animation.fast} ${euiTheme.animation.resistance};

    ${interactive &&
    css`
      cursor: pointer;

      &:hover {
        border-color: ${selected
          ? euiTheme.colors.borderStrongDanger
          : euiTheme.colors.borderBaseDanger};
      }

      &:focus-visible {
        outline: ${euiTheme.focus.width} solid ${euiTheme.colors.borderStrongDanger};
        outline-offset: ${euiTheme.focus.width};
      }
    `}

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `;
};

const subtypeStyles = ({ euiTheme }: UseEuiTheme) => css`
  color: ${euiTheme.colors.textDanger};
  font-weight: ${euiTheme.font.weight.regular};
  line-height: 1;
`;

const nameStyles = ({ euiTheme }: UseEuiTheme) => css`
  color: ${euiTheme.colors.textDanger};
  font-weight: ${euiTheme.font.weight.bold};
  line-height: 1.2;
`;

/**
 * `MetadataKICard` renders an impacted "Knowledge Indicator" as a compact,
 * single-purpose pill-style card. It is the atomic building block of the
 * "Impacted knowledge indicators" panel — engineers compose multiple
 * cards in a responsive CSS grid (`auto-fit, minmax(170px, 1fr)`)
 * inside an `EuiAccordion` to build the panel surface.
 *
 * Selection is fully controlled by the parent; the card itself only
 * renders the visual state and forwards `onClick`.
 *
 * Accessibility:
 * - Interactive variant: real `<button type="button">` with
 *   `aria-pressed` reflecting `selected` (the card is a toggle chip).
 * - Non-interactive variant: `<div>` with `aria-current="true"` when
 *   selected, so screen readers can still convey "this card is the
 *   current selection".
 */
export function MetadataKICard({
  subtype,
  name,
  selected = false,
  onClick,
  'data-test-subj': dataTestSubj = 'metadataKICard',
}: MetadataKICardProps) {
  const euiThemeContext = useEuiTheme();
  const interactive = typeof onClick === 'function';
  const styles = cardStyles(euiThemeContext, selected, interactive);

  const content = (
    <>
      <EuiText size="xs" css={subtypeStyles(euiThemeContext)}>
        {subtype}
      </EuiText>
      <EuiText size="s" css={nameStyles(euiThemeContext)}>
        {name}
      </EuiText>
    </>
  );

  if (interactive) {
    return (
      <button
        type="button"
        css={styles}
        onClick={onClick}
        aria-pressed={selected}
        data-test-subj={dataTestSubj}
      >
        {content}
      </button>
    );
  }

  return (
    <div css={styles} aria-current={selected ? 'true' : undefined} data-test-subj={dataTestSubj}>
      {content}
    </div>
  );
}
