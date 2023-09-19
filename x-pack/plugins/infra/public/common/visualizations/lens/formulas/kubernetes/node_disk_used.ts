/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FormulaValueConfig } from '@kbn/lens-embeddable-utils';

export const nodeDiskUsed: FormulaValueConfig = {
  label: i18n.translate('xpack.infra.assetDetails.formulas.kubernetes.used', {
    defaultMessage: 'Used',
  }),
  value: 'average(kubernetes.node.fs.used.bytes)',
  format: {
    id: 'bytes',
    params: {
      decimals: 1,
    },
  },
};
