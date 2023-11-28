/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { FormulaValueConfig } from '@kbn/lens-embeddable-utils';

export const tx: FormulaValueConfig = {
  label: i18n.translate('xpack.infra.assetDetails.formulas.tx', {
    defaultMessage: 'Network Outbound (TX)',
  }),
  value:
    "average(host.network.egress.bytes) * 8 / (max(metricset.period, kql='host.network.egress.bytes: *') / 1000)",
  format: {
    id: 'bits',
    params: {
      decimals: 1,
    },
  },
  timeScale: 's',
};
