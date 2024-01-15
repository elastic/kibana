/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { FormulaValueConfig } from '@kbn/lens-embeddable-utils';

export const diskIORead: FormulaValueConfig = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.diskIORead', {
    defaultMessage: 'Disk Read IOPS',
  }),
  value: "counter_rate(max(system.diskio.read.count), kql='system.diskio.read.count: *')",
  format: {
    id: 'number',
    params: {
      decimals: 0,
    },
  },
  timeScale: 's',
};
