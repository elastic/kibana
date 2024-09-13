/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { LensBaseLayer } from '@kbn/lens-embeddable-utils/config_builder';

export const rx: LensBaseLayer = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.rx', {
    defaultMessage: 'Network Inbound (RX)',
  }),
  value: 'sum(host.network.ingress.bytes) * 8',
  format: 'bits',
  decimals: 1,
};

export const tx: LensBaseLayer = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.tx', {
    defaultMessage: 'Network Outbound (TX)',
  }),
  value: 'sum(host.network.egress.bytes) * 8',
  format: 'bits',
  decimals: 1,
};
