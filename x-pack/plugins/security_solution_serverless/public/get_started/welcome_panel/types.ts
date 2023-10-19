/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiIconProps } from '@elastic/eui';

export interface HeaderSection {
  description?: React.ReactNode | null;
  footer?: React.ReactNode | null;
  icon: EuiIconProps;
  id: string;
  title: string;
}
