/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiColorPickerSwatch, EuiText, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';

export interface Props {
  color: string;
  label: string;
}

export const SwatchLabel = ({ label, color }: Props) => {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiColorPickerSwatch color={color} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="xs">
          <strong>{label}</strong>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
