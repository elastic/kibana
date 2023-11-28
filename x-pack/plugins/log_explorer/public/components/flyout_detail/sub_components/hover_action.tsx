/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiToolTip, EuiButtonIcon, useEuiTheme, EuiFlexItem } from '@elastic/eui';
import type { IconType } from '@elastic/eui';

export interface HoverActionType {
  id: string;
  tooltipContent: string;
  iconType: IconType;
  onClick: () => void;
  display: boolean;
}

interface HoverActionProps {
  children: React.ReactNode;
  actions: HoverActionType[];
}

export const HoverAction = ({ children, actions }: HoverActionProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      responsive={false}
      alignItems="center"
      justifyContent="flexStart"
      gutterSize="s"
      css={{
        ':hover, :focus-within': {
          '.visibleOnHoverFocus': {
            opacity: 1,
            visibility: 'visible',
          },
        },
      }}
    >
      <EuiFlexItem grow={false}>{children}</EuiFlexItem>
      <EuiFlexGroup
        className="visibleOnHoverFocus"
        css={{
          flexGrow: 0,
          flexShrink: 0,
          opacity: 0,
          visibility: 'hidden',
          transition: `opacity ${euiTheme.animation.normal} ${euiTheme.animation.resistance}, visibility ${euiTheme.animation.normal} ${euiTheme.animation.resistance}`,
        }}
        responsive={false}
        alignItems="center"
        gutterSize="none"
      >
        {actions.map((action) => (
          <EuiToolTip content={action.tooltipContent} key={action.id}>
            <EuiButtonIcon
              size="xs"
              iconType={action.iconType}
              aria-label={action.tooltipContent as string}
              onClick={() => action.onClick()}
            />
          </EuiToolTip>
        ))}
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};
