/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAvatar, EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import type { EuiAvatarProps, useEuiTheme as useEuiThemeFn } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

const MAX_DESCRIPTION_WIDTH = '31em';

export type StatusHeaderVariant = 'critical' | 'noCriticalEvents';

export interface StatusHeaderProps {
  variant?: StatusHeaderVariant;
  title?: string;
  description?: string;
  iconType?: NonNullable<EuiAvatarProps['iconType']>;
  iconColor?: EuiAvatarProps['color'];
  iconGlyphColor?: EuiAvatarProps['iconColor'];
  iconSize?: EuiAvatarProps['size'];
}

export const STATUS_HEADER_DEFAULTS = {
  critical: {
    title: i18n.translate('xpack.nightshift.sigeventsOverview.mainHeading', {
      defaultMessage: 'Your system requires attention',
    }),
    description: i18n.translate('xpack.nightshift.sigeventsOverview.introDescription', {
      defaultMessage:
        'We are detecting more unusual behaviour than normal, review the impact and details and start remediation or further actions.',
    }),
    iconType: 'radar' as const,
  },
  noCriticalEvents: {
    title: i18n.translate(
      'xpack.nightshift.sigeventsOverview.statusHeader.noCriticalEvents.title',
      { defaultMessage: 'You have no critical significant events' }
    ),
    description: i18n.translate(
      'xpack.nightshift.sigeventsOverview.statusHeader.noCriticalEvents.description',
      {
        defaultMessage:
          'Here are some low and medium severity suggestions of significant events we recommend reviewing.',
      }
    ),
    iconType: 'faceHappy' as const,
  },
} as const;

export interface ResolvedStatusHeaderContent {
  title: string;
  description: string;
  iconType: NonNullable<EuiAvatarProps['iconType']>;
  iconColor: NonNullable<EuiAvatarProps['color']>;
  iconGlyphColor: NonNullable<EuiAvatarProps['iconColor']>;
  isNoCriticalVariant: boolean;
}

/**
 * Resolves the title, description, icon and colors for a given StatusHeader
 * variant, applying caller overrides if provided. Shared with `StatusHeaderBanner`
 * so both render identical copy/iconography for the same underlying state.
 */
export const resolveStatusHeaderContent = (
  euiTheme: ReturnType<typeof useEuiThemeFn>['euiTheme'],
  {
    variant = 'critical',
    title,
    description,
    iconType,
    iconColor,
    iconGlyphColor,
  }: Pick<
    StatusHeaderProps,
    'variant' | 'title' | 'description' | 'iconType' | 'iconColor' | 'iconGlyphColor'
  >
): ResolvedStatusHeaderContent => {
  const isNoCriticalVariant = variant === 'noCriticalEvents';
  const defaults = STATUS_HEADER_DEFAULTS[variant];

  return {
    title: title ?? defaults.title,
    description: description ?? defaults.description,
    iconType: iconType ?? defaults.iconType,
    iconColor:
      iconColor ??
      (isNoCriticalVariant
        ? euiTheme.colors.backgroundLightSuccess
        : euiTheme.colors.backgroundLightDanger),
    iconGlyphColor:
      iconGlyphColor ??
      (isNoCriticalVariant ? euiTheme.colors.severity.success : euiTheme.colors.severity.danger),
    isNoCriticalVariant,
  };
};

export const StatusHeader = ({
  variant = 'critical',
  title,
  description,
  iconType,
  iconColor,
  iconGlyphColor,
  iconSize = 'l',
}: StatusHeaderProps) => {
  const { euiTheme } = useEuiTheme();

  const {
    title: resolvedTitle,
    description: resolvedDescription,
    iconType: resolvedIconType,
    iconColor: resolvedIconColor,
    iconGlyphColor: resolvedIconGlyphColor,
    isNoCriticalVariant,
  } = resolveStatusHeaderContent(euiTheme, {
    variant,
    title,
    description,
    iconType,
    iconColor,
    iconGlyphColor,
  });

  const titleColorCss = isNoCriticalVariant
    ? css`
        color: ${euiTheme.colors.textHeading};
      `
    : css`
        color: ${euiTheme.colors.dangerText};
      `;

  return (
    <EuiFlexGroup
      direction="column"
      alignItems="center"
      gutterSize="s"
      responsive={false}
      data-test-subj="sigeventsOverviewStatusHeader"
    >
      <EuiFlexItem grow={false}>
        <EuiAvatar
          size={iconSize}
          name={resolvedTitle}
          iconType={resolvedIconType}
          color={resolvedIconColor}
          iconColor={resolvedIconGlyphColor}
          aria-hidden
        />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiTitle size="m">
          <h2 css={titleColorCss}>{resolvedTitle}</h2>
        </EuiTitle>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiText
          size="xs"
          color="subdued"
          textAlign="left"
          css={css`
            max-width: ${MAX_DESCRIPTION_WIDTH};
          `}
        >
          <p>{resolvedDescription}</p>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
