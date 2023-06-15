/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconProps,
  EuiText,
  EuiTextProps,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

type CPUType = 'self' | 'total';

interface Props {
  type: CPUType;
  labelSize?: EuiTextProps['size'];
  labelStyle?: EuiTextProps['style'];
  iconSize?: EuiIconProps['size'];
}

const CPULabelHintMap: Record<CPUType, { label: string; hint: string }> = {
  self: {
    label: i18n.translate('xpack.profiling.cpu.self.label', {
      defaultMessage: 'Self CPU',
    }),
    hint: i18n.translate('xpack.profiling.cpu.self.hint', {
      defaultMessage:
        'Indicates how much CPU time was spent by the code in the function body, excluding the work done by functions that were called by it',
    }),
  },
  total: {
    label: i18n.translate('xpack.profiling.cpu.total.label', {
      defaultMessage: 'Total CPU',
    }),
    hint: i18n.translate('xpack.profiling.cpu.total.hint', {
      defaultMessage:
        'Indicates how much CPU time was spent by the function and any functions called by it',
    }),
  },
};

export function CPULabelWithHint({ iconSize, labelSize, labelStyle, type }: Props) {
  const { label, hint } = CPULabelHintMap[type];

  return (
    <EuiFlexGroup gutterSize="xs" style={{ flexGrow: 0 }}>
      <EuiFlexItem grow={false}>
        <EuiText size={labelSize} style={labelStyle}>
          {label}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={hint}>
          <EuiIcon type="questionInCircle" size={iconSize} />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
