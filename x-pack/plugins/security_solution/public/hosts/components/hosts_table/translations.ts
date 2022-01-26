/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const HOSTS = i18n.translate('xpack.securitySolution.hostsTable.hostsTitle', {
  defaultMessage: 'All hosts',
});

export const UNIT = (totalCount: number) =>
  i18n.translate('xpack.securitySolution.hostsTable.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {host} other {hosts}}`,
  });

export const RISK_SCORE = i18n.translate('xpack.securitySolution.hostsRiskTable.tableTitle', {
  defaultMessage: 'Host risk',
});

export const NAME = i18n.translate('xpack.securitySolution.hostsTable.nameTitle', {
  defaultMessage: 'Host name',
});

export const LAST_SEEN = i18n.translate('xpack.securitySolution.hostsTable.lastSeenTitle', {
  defaultMessage: 'Last seen',
});

export const FIRST_LAST_SEEN_TOOLTIP = i18n.translate(
  'xpack.securitySolution.hostsTable.firstLastSeenToolTip',
  {
    defaultMessage: 'Relative to the selected date range',
  }
);

export const HOST_RISK_TOOLTIP = i18n.translate(
  'xpack.securitySolution.hostsTable.hostRiskToolTip',
  {
    defaultMessage:
      'Host risk classifcation is determined by host risk score. Hosts classified as Critical or High are indicated as risky.',
  }
);

export const OS_LAST_SEEN_TOOLTIP = i18n.translate(
  'xpack.securitySolution.hostsTable.osLastSeenToolTip',
  {
    defaultMessage: 'Last observed operating system',
  }
);

export const OS = i18n.translate('xpack.securitySolution.hostsTable.osTitle', {
  defaultMessage: 'Operating system',
});

export const VERSION = i18n.translate('xpack.securitySolution.hostsTable.versionTitle', {
  defaultMessage: 'Version',
});

export const HOST_RISK = i18n.translate('xpack.securitySolution.hostsTable.hostRiskTitle', {
  defaultMessage: 'Host risk classification',
});

export const ROWS_5 = i18n.translate('xpack.securitySolution.hostsTable.rows', {
  values: { numRows: 5 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_10 = i18n.translate('xpack.securitySolution.hostsTable.rows', {
  values: { numRows: 10 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});
