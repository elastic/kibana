/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const HOSTS_COUNT = (quantity: number) =>
  i18n.translate('xpack.securitySolution.kpiHosts.riskyHosts.hostsCount', {
    defaultMessage: '{quantity} hosts',
    values: {
      quantity,
    },
  });

export const RISKY_HOSTS = i18n.translate('xpack.securitySolution.kpiHosts.riskyHosts.label', {
  defaultMessage: 'risky hosts',
});

// export const HOSTS_RISK_CRITICAL = i18n.translate(
//   'xpack.securitySolution.kpiHosts.riskyHosts.critical',
//   {
//     defaultMessage: 'Critical',
//   }
// );

// export const HOSTS_RISK_HIGH = i18n.translate('xpack.securitySolution.kpiHosts.riskyHosts.high', {
//   defaultMessage: 'High',
// });
