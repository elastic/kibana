/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconSize, IconType } from '@elastic/eui';
import { EuiIcon, EuiLink } from '@elastic/eui';
import type { LinkAnchorProps } from '@elastic/eui/src/components/link/link';
import type { ReactNode } from 'react';
import React from 'react';
import { euiThemeVars } from '@kbn/ui-theme';
import { css } from '@emotion/react';

function getStyles(iconSide: string) {
  return {
    link: css`
      align-items: center;
      display: inline-flex;
      vertical-align: top;
      white-space: nowrap;
      flex-direction: ${iconSide === 'left' ? 'row' : 'row-reverse'};
    `,
    leftSide: css`
      margin-right: ${euiThemeVars.euiSizeXS};
    `,
    rightSide: css`
      flex-direction: row-reverse;

      .euiIcon {
        margin-left: ${euiThemeVars.euiSizeXS};
      }
    `,
  };
}

export interface LinkIconProps {
  children: string | ReactNode;
  iconSize?: IconSize;
  iconType: IconType;
  dataTestSubj?: string;
  ariaLabel?: string;
  color?: LinkAnchorProps['color'];
  disabled?: boolean;
  iconSide?: 'left' | 'right';
  onClick?: () => void;
}

export const LinkIcon = React.memo<LinkIconProps>(
  ({
    ariaLabel,
    children,
    color,
    dataTestSubj,
    disabled,
    iconSide = 'left',
    iconSize = 's',
    iconType,
    onClick,
    ...rest
  }) => {
    const styles = getStyles(iconSide);

    return (
      <EuiLink
        css={styles.link}
        color={color}
        data-test-subj={dataTestSubj}
        disabled={disabled}
        onClick={onClick}
        aria-label={ariaLabel}
        {...rest}
      >
        <EuiIcon
          css={iconSide === 'left' ? styles.leftSide : styles.rightSide}
          data-test-subj="link-icon"
          size={iconSize}
          type={iconType}
        />
        <span data-test-subj="link-icon-label">{children}</span>
      </EuiLink>
    );
  }
);
LinkIcon.displayName = 'LinkIcon';
