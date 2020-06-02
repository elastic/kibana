/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const TRANSPORT_LAYER_SECURITY = i18n.translate(
  'xpack.securitySolution.network.ipDetails.tlsTable.transportLayerSecurityTitle',
  {
    defaultMessage: 'Transport Layer Security',
  }
);

export const UNIT = (totalCount: number) =>
  i18n.translate('xpack.securitySolution.network.ipDetails.tlsTable.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {server certificate} other {server certificates}}`,
  });

// Columns
export const ISSUER = i18n.translate(
  'xpack.securitySolution.network.ipDetails.tlsTable.columns.issuerTitle',
  {
    defaultMessage: 'Issuer',
  }
);

export const SUBJECT = i18n.translate(
  'xpack.securitySolution.network.ipDetails.tlsTable.columns.subjectTitle',
  {
    defaultMessage: 'Subject',
  }
);

export const SHA1_FINGERPRINT = i18n.translate(
  'xpack.securitySolution.network.ipDetails.tlsTable.columns.sha1FingerPrintTitle',
  {
    defaultMessage: 'SHA1 fingerprint',
  }
);

export const JA3_FINGERPRINT = i18n.translate(
  'xpack.securitySolution.network.ipDetails.tlsTable.columns.ja3FingerPrintTitle',
  {
    defaultMessage: 'JA3 fingerprint',
  }
);

export const VALID_UNTIL = i18n.translate(
  'xpack.securitySolution.network.ipDetails.tlsTable.columns.validUntilTitle',
  {
    defaultMessage: 'Valid until',
  }
);

// Row Select
export const ROWS_5 = i18n.translate('xpack.securitySolution.network.ipDetails.tlsTable.rows', {
  values: { numRows: 5 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_10 = i18n.translate('xpack.securitySolution.network.ipDetails.tlsTable.rows', {
  values: { numRows: 10 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});
