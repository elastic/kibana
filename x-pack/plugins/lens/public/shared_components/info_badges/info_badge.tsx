/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiColorPaletteDisplay,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { type ReactChildren, type ReactChild } from 'react';

export function InfoBadge({
  title,
  dataView,
  index,
  palette,
  children,
  'data-test-subj-prefix': dataTestSubjPrefix,
}: {
  title: string;
  dataView: string;
  index: number;
  palette?: string[];
  children?: ReactChild | ReactChildren;
  'data-test-subj-prefix': string;
}) {
  const { euiTheme } = useEuiTheme();
  const hasColor = Boolean(palette);
  const hasSingleColor = palette && palette.length === 1;
  const hasMultipleColors = palette && palette.length > 1;
  const iconType = hasSingleColor ? 'stopFilled' : 'color';
  return (
    <li
      key={`${title}-${dataView}-${index}`}
      data-test-subj={`${dataTestSubjPrefix}-${index}`}
      css={css`
        margin: ${euiTheme.size.base} 0 0;
      `}
    >
      <EuiFlexGroup justifyContent={hasColor ? 'center' : 'spaceBetween'} gutterSize="s">
        {hasColor ? (
          <EuiFlexItem grow={false}>
            <EuiIcon
              color={hasSingleColor ? palette[0] : undefined}
              type={iconType}
              css={css`
                margin-top: ${euiTheme.size.xxs};
              `}
              data-test-subj={`${dataTestSubjPrefix}-${index}-icon`}
            />
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow={Boolean(palette)}>
          <EuiText size="s" data-test-subj={`${dataTestSubjPrefix}-${index}-title`}>
            {title}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem
          grow={false}
          css={css`
            padding-right: 0;
          `}
        >
          {children}
        </EuiFlexItem>
      </EuiFlexGroup>
      {hasMultipleColors ? (
        <EuiFlexGroup
          justifyContent={'center'}
          gutterSize="s"
          css={css`
            margin-top: ${euiTheme.size.xs};
            overflow-y: hidden;
          `}
        >
          <EuiFlexItem
            grow={false}
            css={css`
              height: ${euiTheme.size.xs};
            `}
          >
            <EuiIcon type="empty" />
          </EuiFlexItem>
          <EuiFlexItem
            grow={Boolean(palette)}
            css={css`
              height: ${euiTheme.size.xs};
            `}
          >
            <EuiColorPaletteDisplay
              size="xs"
              palette={palette}
              data-test-subj={`${dataTestSubjPrefix}-${index}-palette`}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : null}
    </li>
  );
}
