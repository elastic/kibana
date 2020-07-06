/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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

export const OS = i18n.translate('xpack.securitySolution.hostsTable.osTitle', {
  defaultMessage: 'Operating system',
});

export const VERSION = i18n.translate('xpack.securitySolution.hostsTable.versionTitle', {
  defaultMessage: 'Version',
});

export const ROWS_5 = i18n.translate('xpack.securitySolution.hostsTable.rows', {
  values: { numRows: 5 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_10 = i18n.translate('xpack.securitySolution.hostsTable.rows', {
  values: { numRows: 10 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});
