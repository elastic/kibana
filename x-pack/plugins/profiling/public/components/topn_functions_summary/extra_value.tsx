/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import React from 'react';

interface Props {
  value?: string;
  diff?: string;
  color?: string;
  icon?: string;
}

export function ExtraValue({ value, diff, color, icon }: Props) {
  return (
    <EuiFlexGroup direction="row" gutterSize="none" justifyContent="flexEnd">
      <EuiFlexItem grow={false}>
        <EuiText color={color} size="s">
          {`${value} (${diff})`}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {icon && <EuiIcon type={icon} size="m" color={color} />}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
