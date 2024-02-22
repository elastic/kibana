/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiIcon, EuiSwitch, EuiText, EuiToolTip } from '@elastic/eui';
import React from 'react';

interface DescriptiveSwitchProps {
  label: string;
  checked: boolean;
  tooltipText: string;
  onToggle: () => void;
}

export const DescriptiveSwitch = ({
  label,
  checked,
  tooltipText,
  onToggle,
}: DescriptiveSwitchProps) => {
  return (
    <EuiFlexGroup gutterSize="xs" css={{ flexGrow: 'unset' }} alignItems="center">
      <EuiSwitch compressed label={label} checked={checked} onChange={onToggle} showLabel={false} />
      <EuiFlexGroup gutterSize="xs" alignItems="center">
        <EuiText size="xs">{label}</EuiText>
        <EuiToolTip position="bottom" content={tooltipText}>
          <EuiIcon tabIndex={0} type="questionInCircle" size="s" />
        </EuiToolTip>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};
