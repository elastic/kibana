/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { FormulaValueConfig } from '@kbn/lens-embeddable-utils';

export const nodePodCapacity: FormulaValueConfig = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.kubernetes.capacity', {
    defaultMessage: 'Capacity',
  }),
  value:
    "last_value(kubernetes.node.pod.allocatable.total,  kql='kubernetes.node.pod.allocatable.total: *')",
  format: {
    id: 'number',
    params: {
      decimals: 0,
    },
  },
};
