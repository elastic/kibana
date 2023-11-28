/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { FormulaValueConfig } from '@kbn/lens-embeddable-utils';

export const rx: FormulaValueConfig = {
  label: i18n.translate('xpack.infra.assetDetails.formulas.rx', {
    defaultMessage: 'Network Inbound (RX)',
  }),
  value:
    "average(host.network.ingress.bytes) * 8 / (max(metricset.period, kql='host.network.ingress.bytes: *') / 1000)",
  format: {
    id: 'bits',
    params: {
      decimals: 1,
    },
  },
  timeScale: 's',
};
