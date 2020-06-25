/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const AUTHENTICATIONS = i18n.translate(
  'xpack.securitySolution.authenticationsTable.authenticationFailures',
  {
    defaultMessage: 'Authentications',
  }
);

export const UNIT = (totalCount: number) =>
  i18n.translate('xpack.securitySolution.authenticationsTable.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {user} other {users}}`,
  });

export const LAST_SUCCESSFUL_SOURCE = i18n.translate(
  'xpack.securitySolution.authenticationsTable.lastSuccessfulSource',
  {
    defaultMessage: 'Last successful source',
  }
);

export const LAST_SUCCESSFUL_DESTINATION = i18n.translate(
  'xpack.securitySolution.authenticationsTable.lastSuccessfulDestination',
  {
    defaultMessage: 'Last successful destination',
  }
);

export const LAST_SUCCESSFUL_TIME = i18n.translate(
  'xpack.securitySolution.authenticationsTable.lastSuccessfulTime',
  {
    defaultMessage: 'Last success',
  }
);

export const LAST_FAILED_SOURCE = i18n.translate(
  'xpack.securitySolution.authenticationsTable.lastFailedSource',
  {
    defaultMessage: 'Last failed source',
  }
);

export const LAST_FAILED_DESTINATION = i18n.translate(
  'xpack.securitySolution.authenticationsTable.lastFailedDestination',
  {
    defaultMessage: 'Last failed destination',
  }
);

export const LAST_FAILED_TIME = i18n.translate(
  'xpack.securitySolution.authenticationsTable.lastFailedTime',
  {
    defaultMessage: 'Last failure',
  }
);

export const SUCCESSES = i18n.translate('xpack.securitySolution.authenticationsTable.successes', {
  defaultMessage: 'Successes',
});

export const FAILURES = i18n.translate('xpack.securitySolution.authenticationsTable.failures', {
  defaultMessage: 'Failures',
});

export const USER = i18n.translate('xpack.securitySolution.authenticationsTable.user', {
  defaultMessage: 'User',
});

export const ROWS_5 = i18n.translate('xpack.securitySolution.authenticationsTable.rows', {
  values: { numRows: 5 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_10 = i18n.translate('xpack.securitySolution.authenticationsTable.rows', {
  values: { numRows: 10 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});
