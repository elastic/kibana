/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const TRANSPORT_LAYER_SECURITY = i18n.translate(
  'xpack.siem.network.ipDetails.domainsTable.transportLayerSecurityTitle',
  {
    defaultMessage: 'Transport Layer Security',
  }
);

// Columns
export const ISSUER = i18n.translate(
  'xpack.siem.network.ipDetails.domainsTable.columns.issuerTitle',
  {
    defaultMessage: 'Issuer',
  }
);

export const SUBJECT = i18n.translate(
  'xpack.siem.network.ipDetails.domainsTable.columns.subjectTitle',
  {
    defaultMessage: 'Subject',
  }
);

export const SHA1_FINGERPRINT = i18n.translate(
  'xpack.siem.network.ipDetails.domainsTable.columns.sha1FingerPrintTitle',
  {
    defaultMessage: 'SHA1 Fingerprint',
  }
);

export const JA3_FINGERPRINT = i18n.translate(
  'xpack.siem.network.ipDetails.domainsTable.columns.ja3FingerPrintTitle',
  {
    defaultMessage: 'JA3 Fingerprint',
  }
);

export const VALID_UNTIL = i18n.translate(
  'xpack.siem.network.ipDetails.domainsTable.columns.validUntilTitle',
  {
    defaultMessage: 'Valid Until',
  }
);

// Row Select
export const ROWS_5 = i18n.translate('xpack.siem.network.ipDetails.domainsTable.rows', {
  values: { numRows: 5 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_10 = i18n.translate('xpack.siem.network.ipDetails.domainsTable.rows', {
  values: { numRows: 10 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_20 = i18n.translate('xpack.siem.network.ipDetails.domainsTable.rows', {
  values: { numRows: 20 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_50 = i18n.translate('xpack.siem.network.ipDetails.domainsTable.rows', {
  values: { numRows: 50 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const MORE = i18n.translate('xpack.siem.network.ipDetails.domainsTable.moreDescription', {
  defaultMessage: 'More ...',
});
