/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const HOSTS_COUNT = (quantity: number) =>
  i18n.translate('xpack.securitySolution.kpiHosts.riskyHosts.hostsCount', {
    defaultMessage: '{quantity} {quantity, plural, =1 {host} other {hosts}}',
    values: {
      quantity,
    },
  });

export const RISKY_HOSTS_DESCRIPTION = (quantity: number, formattedQuantity: string) =>
  i18n.translate('xpack.securitySolution.kpiHosts.riskyHosts.description', {
    defaultMessage: '{formattedQuantity} Risky {quantity, plural, =1 {Host} other {Hosts}}',
    values: {
      formattedQuantity,
      quantity,
    },
  });

export const RISKY_HOSTS_TITLE = i18n.translate(
  'xpack.securitySolution.kpiHosts.riskyHosts.title',
  {
    defaultMessage: 'Risky Hosts',
  }
);

export const INSPECT_RISKY_HOSTS = i18n.translate(
  'xpack.securitySolution.kpiHosts.riskyHosts.inspectTitle',
  {
    defaultMessage: 'Risky Hosts',
  }
);

export const ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.kpiHosts.riskyHosts.errorMessage',
  {
    defaultMessage: 'Error Fetching Risky Hosts API',
  }
);
