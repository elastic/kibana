/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAvatar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiAvatarProps } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

export interface MetadataIconCardProps {
  title: string;
  value: React.ReactNode;
  color?: EuiAvatarProps['color'];
  iconColor?: EuiAvatarProps['iconColor'];
  hideIcon?: boolean;
  iconType?: NonNullable<EuiAvatarProps['iconType']>;
  href?: string;
}

export function MetadataIconCard({
  title,
  iconType,
  value,
  color,
  iconColor,
  hideIcon = false,
  href,
}: MetadataIconCardProps) {
  const { euiTheme } = useEuiTheme();

  const panelCss = css`
    border-radius: 8px;
    white-space: nowrap;
  `;

  const linkCss = css`
    display: block;
    text-decoration: none;
    color: inherit;
    &:hover,
    &:focus {
      text-decoration: none;
      color: inherit;
    }
  `;

  const wrapWithLink = (content: React.ReactElement) => {
    if (!href) return content;
    return (
      <a href={href} css={linkCss}>
        {content}
      </a>
    );
  };

  if (hideIcon) {
    return wrapWithLink(
      <EuiPanel
        hasShadow={false}
        hasBorder
        paddingSize="s"
        css={panelCss}
        data-test-subj="sigeventsOverviewMetadataIconCard"
      >
        <EuiTitle size="xxxs">
          <p>{title}</p>
        </EuiTitle>
        <EuiText size="xs" css={css({ marginTop: euiTheme.size.xs })}>
          {value}
        </EuiText>
      </EuiPanel>
    );
  }

  return wrapWithLink(
    <EuiPanel
      hasShadow={false}
      hasBorder
      paddingSize="s"
      css={panelCss}
      data-test-subj="sigeventsOverviewMetadataIconCard"
    >
      <EuiTitle size="xxxs">
        <p>{title}</p>
      </EuiTitle>
      <EuiFlexGroup
        alignItems="center"
        gutterSize="xs"
        responsive={false}
        css={css({ marginTop: euiTheme.size.xs })}
      >
        <EuiFlexItem grow={false}>
          <EuiAvatar
            type="space"
            size="s"
            name={title}
            iconType={iconType ?? 'alert'}
            color={color ?? euiTheme.colors.backgroundBaseSubdued}
            iconColor={iconColor}
            aria-hidden={true}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs">{value}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
