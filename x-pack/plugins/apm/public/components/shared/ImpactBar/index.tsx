/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProgress } from '@elastic/eui';
import React from 'react';

// TODO: extend from EUI's EuiProgress prop interface
export interface ImpactBarProps extends Record<string, unknown> {
  value: number;
  size?: 's' | 'l' | 'm';
  max?: number;
  color?: string;
}

export function ImpactBar({
  value,
  size = 'l',
  max = 100,
  color = 'primary',
  ...rest
}: ImpactBarProps) {
  return (
    <EuiProgress size={size} value={value} max={max} color={color} {...rest} />
  );
}
