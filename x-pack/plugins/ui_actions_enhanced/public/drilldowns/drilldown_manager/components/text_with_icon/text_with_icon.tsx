/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { EuiTextColor, EuiTextColorProps, EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';

export interface TextWithIconProps {
  icon?: string;
  iconColor?: string;
  color?: EuiTextColorProps['color'];
}

export const TextWithIcon: React.FC<TextWithIconProps> = ({ icon, iconColor, color, children }) => {
  return (
    <EuiFlexGroup responsive={false} alignItems="center" gutterSize={'s'}>
      {!!icon && (
        <EuiFlexItem grow={false}>
          <EuiIcon color={iconColor} type={icon} />
        </EuiFlexItem>
      )}
      {!!children && (
        <EuiFlexItem grow={false} style={{ flexWrap: 'wrap' }}>
          <EuiTextColor color={color}>{children}</EuiTextColor>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
