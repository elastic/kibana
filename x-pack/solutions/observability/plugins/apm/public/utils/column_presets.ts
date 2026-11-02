/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RIGHT_ALIGNMENT } from '@elastic/eui';
import type { ColumnPreset } from '@kbn/shared-ux-column-presets';

export const listMetricColumnPreset: ColumnPreset = () => ({
  width: '15em',
  maxWidth: '15em',
  className: 'eui-textNoWrap',
  align: RIGHT_ALIGNMENT,
});

export const impactColumnPreset: ColumnPreset = () => ({
  align: RIGHT_ALIGNMENT,
  width: '8em',
  minWidth: '8em',
  maxWidth: '8em',
});
