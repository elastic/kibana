/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const TOP_DNS_DOMAINS = i18n.translate('xpack.securitySolution.networkDnsTable.title', {
  defaultMessage: 'Top DNS domains',
});

export const UNIT = (totalCount: number) =>
  i18n.translate('xpack.securitySolution.networkDnsTable.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {domain} other {domains}}`,
  });

export const TOOLTIP = i18n.translate('xpack.securitySolution.networkDnsTable.helperTooltip', {
  defaultMessage:
    'This shows DNS protocol traffic only and can be useful for hunting domains used in DNS data exfiltration.',
});

export const REGISTERED_DOMAIN = i18n.translate(
  'xpack.securitySolution.networkDnsTable.column.registeredDomain',
  {
    defaultMessage: 'Registered domain',
  }
);

export const TOTAL_QUERIES = i18n.translate(
  'xpack.securitySolution.networkDnsTable.column.TotalQueriesTitle',
  {
    defaultMessage: 'Total queries',
  }
);

export const UNIQUE_DOMAINS = i18n.translate(
  'xpack.securitySolution.networkDnsTable.column.uniqueDomainsTitle',
  {
    defaultMessage: 'Unique domains',
  }
);

export const DNS_BYTES_IN = i18n.translate(
  'xpack.securitySolution.networkDnsTable.column.bytesInTitle',
  {
    defaultMessage: 'DNS bytes in',
  }
);

export const DNS_BYTES_OUT = i18n.translate(
  'xpack.securitySolution.networkDnsTable.column.bytesOutTitle',
  {
    defaultMessage: 'DNS bytes out',
  }
);

export const INCLUDE_PTR_RECORDS = i18n.translate(
  'xpack.securitySolution.networkDnsTable.select.includePtrRecords',
  {
    defaultMessage: 'Include PTR records',
  }
);

export const ROWS_5 = i18n.translate('xpack.securitySolution.networkDnsTable.rows', {
  values: { numRows: 5 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_10 = i18n.translate('xpack.securitySolution.networkDnsTable.rows', {
  values: { numRows: 10 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});
