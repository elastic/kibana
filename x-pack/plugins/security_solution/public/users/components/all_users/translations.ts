/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const USERS = i18n.translate('xpack.securitySolution.usersTable.title', {
  defaultMessage: 'Users',
});

export const USER_NAME = i18n.translate('xpack.securitySolution.usersTable.userNameTitle', {
  defaultMessage: 'User name',
});

export const LAST_SEEN = i18n.translate('xpack.securitySolution.usersTable.lastSeenTitle', {
  defaultMessage: 'Last seen',
});

export const DOMAIN = i18n.translate('xpack.securitySolution.usersTable.domainTitle', {
  defaultMessage: 'Domain',
});

export const ROWS_5 = i18n.translate('xpack.securitySolution.usersTable.rows', {
  values: { numRows: 5 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_10 = i18n.translate('xpack.securitySolution.usersTable.rows', {
  values: { numRows: 10 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const UNIT = (totalCount: number) =>
  i18n.translate('xpack.securitySolution.usersTable.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {user} other {users}}`,
  });
