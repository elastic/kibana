/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const USER_NAME = i18n.translate('xpack.securitySolution.usersRiskTable.userNameTitle', {
  defaultMessage: 'User Name',
});

export const USER_RISK_SCORE = i18n.translate(
  'xpack.securitySolution.usersRiskTable.userRiskScoreTitle',
  {
    defaultMessage: 'User risk score',
  }
);

export const USER_RISK_TOOLTIP = i18n.translate(
  'xpack.securitySolution.usersRiskTable.userRiskToolTip',
  {
    defaultMessage:
      'User risk classification is determined by user risk score. Users classified as Critical or High are indicated as risky.',
  }
);

export const USER_RISK = i18n.translate('xpack.securitySolution.usersRiskTable.riskTitle', {
  defaultMessage: 'User risk classification',
});

export const VIEW_USERS_BY_SEVERITY = (severity: string) =>
  i18n.translate('xpack.securitySolution.usersRiskTable.filteredUsersTitle', {
    values: { severity },
    defaultMessage: 'View {severity} risk users',
  });

export const UNIT = (totalCount: number) =>
  i18n.translate('xpack.securitySolution.usersTable.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {user} other {users}}`,
  });

export const ROWS_5 = i18n.translate('xpack.securitySolution.usersTable.rows', {
  values: { numRows: 5 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_10 = i18n.translate('xpack.securitySolution.usersTable.rows', {
  values: { numRows: 10 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const USER_RISK_TABLE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.hostsRiskTable.usersTableTitle',
  {
    defaultMessage:
      'The user risk table is not affected by the KQL time range. This table shows the latest recorded risk score for each user.',
  }
);
