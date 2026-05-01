/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAvatar, EuiCard, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import type { EuiAvatarProps } from '@elastic/eui';
import { css } from '@emotion/react';

export interface ImpactedCardProps {
  label: string;
  value: React.ReactNode;
  iconType?: NonNullable<EuiAvatarProps['iconType']>;
  onClick?: () => void;
}

export function ImpactedCard({ label, value, iconType = 'package', onClick }: ImpactedCardProps) {
  const { euiTheme } = useEuiTheme();

  const cardCss = css`
    background: ${euiTheme.colors.backgroundBaseDanger};
    border: ${euiTheme.border.thin};
    border-radius: 8px;

    // EuiCard wraps its description in an EuiText <p>. Force danger styling
    // for both the title header row and the value description.
    & * {
      color: ${euiTheme.colors.textDanger};
    }
  `;

  const labelCss = css`
    color: ${euiTheme.colors.textDanger};
    font-size: ${euiTheme.font.scale.xs}rem;
    font-weight: ${euiTheme.font.weight.medium};
    line-height: ${euiTheme.size.base};
  `;

  const valueCss = css`
    font-weight: ${euiTheme.font.weight.semiBold};
  `;

  const header = (
    <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiAvatar
          type="space"
          size="s"
          name={label}
          iconType={iconType}
          color={euiTheme.colors.backgroundLightDanger}
          iconColor={euiTheme.colors.textDanger}
          aria-hidden
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <span css={labelCss}>{label}</span>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <EuiCard
      data-test-subj="sigeventsOverviewImpactedCard"
      display="transparent"
      paddingSize="s"
      textAlign="left"
      titleSize="xs"
      title={header}
      titleElement="span"
      description={<span css={valueCss}>{value}</span>}
      onClick={onClick}
      css={cardCss}
    />
  );
}
