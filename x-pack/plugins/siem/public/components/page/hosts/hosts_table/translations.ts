/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const HOSTS = i18n.translate('xpack.siem.hostsTable.hostsTitle', {
  defaultMessage: 'Hosts',
});

export const UNIT = (totalCount: number) =>
  i18n.translate('xpack.siem.hostsTable.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {Host} other {Hosts}}`,
  });

export const NAME = i18n.translate('xpack.siem.hostsTable.nameTitle', {
  defaultMessage: 'Name',
});

export const FIRST_SEEN = i18n.translate('xpack.siem.hostsTable.firstSeenTitle', {
  defaultMessage: 'First Seen',
});

export const LAST_SEEN = i18n.translate('xpack.siem.hostsTable.lastSeenTitle', {
  defaultMessage: 'Last Seen',
});

export const FIRST_LAST_SEEN_TOOLTIP = i18n.translate(
  'xpack.siem.hostsTable.firstLastSeenToolTip',
  {
    defaultMessage: 'Relative to the selected date range',
  }
);

export const OS = i18n.translate('xpack.siem.hostsTable.osTitle', {
  defaultMessage: 'OS',
});

export const VERSION = i18n.translate('xpack.siem.hostsTable.versionTitle', {
  defaultMessage: 'Version',
});

export const TOOLTIP = i18n.translate('xpack.siem.hostsTable.helperTooltip', {
  defaultMessage: 'Hosts table is sorted by last seen',
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
