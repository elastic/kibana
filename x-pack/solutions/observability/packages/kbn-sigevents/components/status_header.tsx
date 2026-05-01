/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAvatar, EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import type { EuiAvatarProps } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

const MAX_DESCRIPTION_WIDTH = 640;

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

const DEFAULT_CRITICAL_TITLE = i18n.translate('xpack.observability.sigeventsOverview.mainHeading', {
  defaultMessage: 'Your system requires attention',
});

const DEFAULT_CRITICAL_DESCRIPTION = i18n.translate(
  'xpack.observability.sigeventsOverview.introDescription',
  {
    defaultMessage:
      'We are detecting more unusual behaviour than normal, review the impact and details and start remediation or further actions.',
  }
);

const DEFAULT_NO_CRITICAL_TITLE = i18n.translate(
  'xpack.observability.sigeventsOverview.statusHeader.noCriticalEvents.title',
  { defaultMessage: 'You have no critical significant events' }
);

const DEFAULT_NO_CRITICAL_DESCRIPTION = i18n.translate(
  'xpack.observability.sigeventsOverview.statusHeader.noCriticalEvents.description',
  {
    defaultMessage:
      'Here are some low and medium severity suggestions of significant events we recommend reviewing.',
  }
);

export function StatusHeader({
  variant = 'critical',
  title,
  description,
  iconType,
  iconColor,
  iconGlyphColor,
  iconSize = 'l',
}: StatusHeaderProps) {
  const { euiTheme } = useEuiTheme();

  const isNoCriticalVariant = variant === 'noCriticalEvents';

  const resolvedTitle =
    title ?? (isNoCriticalVariant ? DEFAULT_NO_CRITICAL_TITLE : DEFAULT_CRITICAL_TITLE);

  const resolvedDescription =
    description ??
    (isNoCriticalVariant ? DEFAULT_NO_CRITICAL_DESCRIPTION : DEFAULT_CRITICAL_DESCRIPTION);

  const resolvedIconType = iconType ?? (isNoCriticalVariant ? 'faceHappy' : 'radar');
  const resolvedIconColor =
    iconColor ??
    (isNoCriticalVariant
      ? euiTheme.colors.backgroundLightSuccess
      : euiTheme.colors.backgroundLightDanger);
  const resolvedIconGlyphColor =
    iconGlyphColor ??
    (isNoCriticalVariant ? euiTheme.colors.severity.success : euiTheme.colors.severity.danger);

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
          textAlign="center"
          css={css`
            max-width: ${MAX_DESCRIPTION_WIDTH}px;
          `}
        >
          <p>{resolvedDescription}</p>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
