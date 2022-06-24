/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiBadge, EuiCard } from '@elastic/eui';

export interface ButtonGroupOption {
  id: string;
  icon: string;
  label: string;
  description: string;
  footer: string;
  badgeLabel?: string;
}

interface Props {
  options: ButtonGroupOption[];
  selected?: ButtonGroupOption;
  onChange(option: ButtonGroupOption): void;
}

export const ButtonGroup: React.FC<Props> = ({ options, selected, onChange }) => (
  <EuiFlexGroup direction="column" gutterSize="l">
    {options.map((option) => (
      <EuiFlexItem grow={false}>
        <EuiCard
          hasBorder
          titleSize="xs"
          title={option.label}
          description={
            <EuiText size="xs" color="subdued">
              {option.description}
            </EuiText>
          }
          footer={<EuiBadge color="hollow">{option.footer}</EuiBadge>}
          selectable={{
            onClick: () => onChange(option),
            isSelected: option === selected,
          }}
          betaBadgeProps={{
            label: option.badgeLabel,
            size: 's',
          }}
        />
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);
