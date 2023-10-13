/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const HOST_NAME = i18n.translate('xpack.securitySolution.hostsRiskTable.hostNameTitle', {
  defaultMessage: 'Host Name',
});

export const HOST_RISK_SCORE = i18n.translate(
  'xpack.securitySolution.hostsRiskTable.hostRiskScoreTitle',
  {
    defaultMessage: 'Host risk score',
  }
);

export const HOST_RISK = i18n.translate('xpack.securitySolution.hostsRiskTable.riskTitle', {
  defaultMessage: 'Host risk level',
});

export const HOST_RISK_TITLE = i18n.translate(
  'xpack.securitySolution.hostsRiskTable.hostRiskTitle',
  {
    defaultMessage: 'Host risk',
  }
);

export const VIEW_HOSTS_BY_SEVERITY = (severity: string) =>
  i18n.translate('xpack.securitySolution.hostsRiskTable.filteredHostsTitle', {
    values: { severity },
    defaultMessage: 'View {severity} risk hosts',
  });

export const LAST_UPDATED = i18n.translate(
  'xpack.securitySolution.hostsRiskTable.lastUpdatedTitle',
  {
    defaultMessage: 'Last updated',
  }
);
