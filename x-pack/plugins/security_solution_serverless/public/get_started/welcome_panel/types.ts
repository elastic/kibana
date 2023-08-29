/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { EuiIconProps } from '@elastic/eui';

export interface HeaderSection {
  description?: (params: {
    cloud: CloudStart;
    totalActiveSteps: number | null;
    totalStepsLeft: number | null;
  }) => React.ReactNode | null;
  footer?: (params: { cloud: CloudStart }) => React.ReactNode | null;
  icon: EuiIconProps;
  id: string;
  title: string;
}
