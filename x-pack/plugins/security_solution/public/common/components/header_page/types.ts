/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadgeProps } from '@elastic/eui';
import type React from 'react';
export type TitleProp = string | React.ReactNode;

export interface DraggableArguments {
  field: string;
  value: string;
}

export interface BadgeOptions {
  beta?: boolean;
  text: React.ReactNode;
  tooltip?: React.ReactNode;
  color?: EuiBadgeProps['color'];
}
