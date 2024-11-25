/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import React from 'react';

interface RenderMessageWithIconProps {
  icon: string;
  color: string;
  label: string;
  labelColor?: string;
}
export const RenderMessageWithIcon: React.FC<RenderMessageWithIconProps> = ({
  icon,
  color,
  label,
  labelColor,
}) => (
  <EuiFlexGroup alignItems={'center'} gutterSize={'s'}>
    <EuiFlexItem grow={false}>
      <EuiIcon size="s" type={icon} color={color} />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText size={'xs'} textAlign={'left'} color={labelColor ?? 'default'}>
        {label}
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);
