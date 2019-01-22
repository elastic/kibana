/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const LATEST = i18n.translate('xpack.secops.authenticationsTable.latest', {
  defaultMessage: 'Latest',
});

export const TO = i18n.translate('xpack.secops.authenticationsTable.to', {
  defaultMessage: 'To',
});

export const FROM = i18n.translate('xpack.secops.authenticationsTable.from', {
  defaultMessage: 'From',
});

export const SUCCESSES = i18n.translate('xpack.secops.authenticationsTable.successes', {
  defaultMessage: 'Successes',
});

export const FAILURES = i18n.translate('xpack.secops.authenticationsTable.failures', {
  defaultMessage: 'Failures',
});

export const USER = i18n.translate('xpack.secops.authenticationsTable.user', {
  defaultMessage: 'User',
});

export const AUTHENTICATION_FAILURES = i18n.translate(
  'xpack.secops.authenticationsTable.authenticationFailures',
  {
    defaultMessage: 'Authentication Failures',
  }
);

export const ROWS_5 = i18n.translate('xpack.secops.authenticationsTable.rows', {
  values: { numRows: 5 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_10 = i18n.translate('xpack.secops.authenticationsTable.rows', {
  values: { numRows: 10 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_20 = i18n.translate('xpack.secops.authenticationsTable.rows', {
  values: { numRows: 20 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_50 = i18n.translate('xpack.secops.authenticationsTable.rows', {
  values: { numRows: 50 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});
