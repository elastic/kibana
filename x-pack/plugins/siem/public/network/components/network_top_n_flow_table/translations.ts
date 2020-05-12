/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const UNIT = (totalCount: number) =>
  i18n.translate('xpack.siem.networkTopNFlowTable.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {IP} other {IPs}}`,
  });

export const SOURCE_IP = i18n.translate('xpack.siem.networkTopNFlowTable.column.sourceIpTitle', {
  defaultMessage: 'Source IPs',
});

export const DESTINATION_IP = i18n.translate(
  'xpack.siem.networkTopNFlowTable.column.destinationIpTitle',
  {
    defaultMessage: 'Destination IPs',
  }
);

export const IP_TITLE = i18n.translate('xpack.siem.networkTopNFlowTable.column.IpTitle', {
  defaultMessage: 'IP',
});

export const DOMAIN = i18n.translate('xpack.siem.networkTopNFlowTable.column.domainTitle', {
  defaultMessage: 'Domain',
});

export const BYTES_IN = i18n.translate('xpack.siem.networkTopNFlowTable.column.bytesInTitle', {
  defaultMessage: 'Bytes in',
});

export const BYTES_OUT = i18n.translate('xpack.siem.networkTopNFlowTable.column.bytesOutTitle', {
  defaultMessage: 'Bytes out',
});

export const AUTONOMOUS_SYSTEM = i18n.translate('xpack.siem.networkTopNFlowTable.column.asTitle', {
  defaultMessage: 'Autonomous system',
});

export const FLOWS = i18n.translate('xpack.siem.networkTopNFlowTable.flows', {
  defaultMessage: 'Flows',
});

export const DESTINATION_IPS = i18n.translate('xpack.siem.networkTopNFlowTable.destinationIps', {
  defaultMessage: 'Destination IPs',
});

export const SOURCE_IPS = i18n.translate('xpack.siem.networkTopNFlowTable.sourceIps', {
  defaultMessage: 'Source IPs',
});

export const ROWS_5 = i18n.translate('xpack.siem.networkTopNFlowTable.rows', {
  values: { numRows: 5 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_10 = i18n.translate('xpack.siem.networkTopNFlowTable.rows', {
  values: { numRows: 10 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});
