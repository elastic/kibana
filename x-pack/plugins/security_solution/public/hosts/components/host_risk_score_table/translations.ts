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
  defaultMessage: 'Host risk classification',
});

export const HOST_RISK_TOOLTIP = i18n.translate(
  'xpack.securitySolution.hostsRiskTable.hostRiskToolTip',
  {
    defaultMessage:
      'Host risk classification is determined by host risk score. Hosts classified as Critical or High are indicated as risky.',
  }
);

export const HOSTS_BY_RISK = i18n.translate('xpack.securitySolution.hostsRiskTable.hostsTitle', {
  defaultMessage: 'Hosts by risk',
});

export const HOST_RISK_TABLE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.hostsRiskTable.hostsTableTitle',
  {
    defaultMessage:
      'The host risk table is not affected by the KQL time range. This table shows the latest recorded risk score for each host.',
  }
);

export const VIEW_HOSTS_BY_SEVERITY = (severity: string) =>
  i18n.translate('xpack.securitySolution.hostsRiskTable.filteredHostsTitle', {
    values: { severity },
    defaultMessage: 'View {severity} risk hosts',
  });
