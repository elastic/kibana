/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IconType } from '@elastic/eui';

import type { LensAttributes } from '../../../common/components/visualization_actions/types';

export interface FieldConfigs {
  color?: string;
  description?: string;
  icon?: IconType;
  key: string;
  lensAttributes?: LensAttributes;
  name?: string;
}

export interface StatItems {
  description?: string;
  enableAreaChart?: boolean;
  enableBarChart?: boolean;
  fields: FieldConfigs[];
  key: string;
  barChartLensAttributes?: LensAttributes;
  areaChartLensAttributes?: LensAttributes;
}

export interface StatItemsProps {
  from: string;
  id: string;
  statItems: StatItems;
  to: string;
}
