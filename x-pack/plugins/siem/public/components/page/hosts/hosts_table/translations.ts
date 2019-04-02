/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const HOSTS = i18n.translate('xpack.siem.hostsTable.hosts', {
  defaultMessage: 'Hosts',
});

export const NAME = i18n.translate('xpack.siem.hostsTable.name', {
  defaultMessage: 'Name',
});

export const FIRST_SEEN = i18n.translate('xpack.siem.hostsTable.firstSeen', {
  defaultMessage: 'First Seen',
});

export const OS = i18n.translate('xpack.siem.hostsTable.os', {
  defaultMessage: 'OS',
});

export const VERSION = i18n.translate('xpack.siem.hostsTable.version', {
  defaultMessage: 'Version',
});

export const ROWS_2 = i18n.translate('xpack.siem.hostsTable.rows', {
  values: { numRows: 2 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_5 = i18n.translate('xpack.siem.hostsTable.rows', {
  values: { numRows: 5 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_10 = i18n.translate('xpack.siem.hostsTable.rows', {
  values: { numRows: 10 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_20 = i18n.translate('xpack.siem.hostsTable.rows', {
  values: { numRows: 20 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_50 = i18n.translate('xpack.siem.hostsTable.rows', {
  values: { numRows: 50 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});
