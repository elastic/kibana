/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const USERS = i18n.translate(
  'xpack.securitySolution.network.ipDetails.usersTable.usersTitle',
  {
    defaultMessage: 'Users',
  }
);

export const UNIT = (totalCount: number) =>
  i18n.translate('xpack.securitySolution.network.ipDetails.usersTable.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {user} other {users}}`,
  });

// Columns
export const USER_NAME = i18n.translate(
  'xpack.securitySolution.network.ipDetails.usersTable.columns.userNameTitle',
  {
    defaultMessage: 'User',
  }
);

export const USER_ID = i18n.translate(
  'xpack.securitySolution.network.ipDetails.usersTable.columns.userIdTitle',
  {
    defaultMessage: 'ID',
  }
);

export const GROUP_NAME = i18n.translate(
  'xpack.securitySolution.network.ipDetails.usersTable.columns.groupNameTitle',
  {
    defaultMessage: 'Group name',
  }
);

export const GROUP_ID = i18n.translate(
  'xpack.securitySolution.network.ipDetails.usersTable.columns.groupIdTitle',
  {
    defaultMessage: 'Group ID',
  }
);

export const DOCUMENT_COUNT = i18n.translate(
  'xpack.securitySolution.network.ipDetails.usersTable.columns.documentCountTitle',
  {
    defaultMessage: 'Document count',
  }
);

// Row Select
export const ROWS_5 = i18n.translate('xpack.securitySolution.network.ipDetails.usersTable.rows', {
  values: { numRows: 5 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_10 = i18n.translate('xpack.securitySolution.network.ipDetails.usersTable.rows', {
  values: { numRows: 10 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});
