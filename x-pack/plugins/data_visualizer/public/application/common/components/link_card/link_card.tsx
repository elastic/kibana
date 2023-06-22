/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import {
  EuiIcon,
  IconType,
  EuiText,
  EuiTitle,
  EuiFlexItem,
  EuiFlexGroup,
  EuiPanel,
  EuiLink,
} from '@elastic/eui';
import { useCurrentEuiTheme } from '../../hooks/use_current_eui_theme';

export interface LinkCardProps {
  icon: IconType;
  iconAreaLabel?: string;
  title: any;
  description: any;
  href?: string;
  onClick?: () => void;
  isDisabled?: boolean;
  'data-test-subj'?: string;
}

// Component for rendering a card which links to the Create Job page, displaying an
// icon, card title, description and link.
export const LinkCard: FC<LinkCardProps> = ({
  icon,
  iconAreaLabel,
  title,
  description,
  onClick,
  href,
  isDisabled,
  'data-test-subj': dataTestSubj,
}) => {
  const euiTheme = useCurrentEuiTheme();

  const linkHrefAndOnClickProps = {
    ...(href ? { href } : {}),
    ...(onClick ? { onClick } : {}),
  };
  return (
    <EuiPanel
      style={{ cursor: isDisabled ? 'not-allowed' : undefined }}
      hasShadow={false}
      hasBorder
    >
      <EuiLink
        style={{
          display: 'block',
          pointerEvents: isDisabled ? 'none' : undefined,
          background: 'transparent',
          outline: 'none',
        }}
        data-test-subj={dataTestSubj}
        color="subdued"
        {...linkHrefAndOnClickProps}
      >
        <EuiFlexGroup gutterSize="s" responsive={true}>
          <EuiFlexItem grow={false} css={{ paddingTop: euiTheme.euiSizeXS }}>
            {typeof icon === 'string' ? (
              <EuiIcon size="m" type={icon} aria-label={iconAreaLabel} />
            ) : (
              icon
            )}
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h3>{title}</h3>
            </EuiTitle>
            <EuiText color="subdued" size={'s'}>
              <p>{description}</p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiLink>
    </EuiPanel>
  );
};
