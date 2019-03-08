/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const TOP_TALKERS = i18n.translate('xpack.secops.networkDnsTable.title', {
  defaultMessage: 'Top Talkers',
});

export const NAME = i18n.translate('xpack.secops.networkDnsTable.column.nameTitle', {
  defaultMessage: 'Name',
});

export const COUNT = i18n.translate('xpack.secops.networkDnsTable.column.CountTitle', {
  defaultMessage: 'Count',
});

export const UNIQUE_DOMAINS = i18n.translate(
  'xpack.secops.networkDnsTable.column.uniqueDomainsTitle',
  {
    defaultMessage: 'Unique Domains',
  }
);

export const DNS_BYTES_IN = i18n.translate('xpack.secops.networkDnsTable.column.bytesInTitle', {
  defaultMessage: 'DNS Bytes In',
});

export const DNS_BYTES_OUT = i18n.translate('xpack.secops.networkDnsTable.column.bytesOutTitle', {
  defaultMessage: 'DNS Bytes Out',
});

export const INCLUDE_PTR_RECORDS = i18n.translate(
  'xpack.secops.networkDnsTable.select.includePtrRecords',
  {
    defaultMessage: 'Include PTR Records',
  }
);

export const ROWS_5 = i18n.translate('xpack.secops.networkDnsTable.rows', {
  values: { numRows: 5 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_10 = i18n.translate('xpack.secops.networkDnsTable.rows', {
  values: { numRows: 10 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_20 = i18n.translate('xpack.secops.networkDnsTable.rows', {
  values: { numRows: 20 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_50 = i18n.translate('xpack.secops.networkDnsTable.rows', {
  values: { numRows: 50 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});
