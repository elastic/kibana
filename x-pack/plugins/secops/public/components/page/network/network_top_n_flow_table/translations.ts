/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const SOURCE = i18n.translate('xpack.secops.networkTopNFlowTable.sourceTitle', {
  defaultMessage: 'Top sources',
});

export const DESTINATION = i18n.translate('xpack.secops.networkTopNFlowTable.destinationTitle', {
  defaultMessage: 'Top destinations',
});

export const SOURCE_IP = i18n.translate('xpack.secops.networkTopNFlowTable.topSourceIp', {
  defaultMessage: 'Source Ip',
});

export const DESTINATION_IP = i18n.translate('xpack.secops.networkTopNFlowTable.topDestinationIp', {
  defaultMessage: 'Destination Ip',
});

export const DOMAIN = i18n.translate('xpack.secops.networkTopNFlowTable.domain', {
  defaultMessage: 'Domain',
});

export const BYTES = i18n.translate('xpack.secops.networkTopNFlowTable.bytes', {
  defaultMessage: 'Bytes',
});

export const PACKETS = i18n.translate('xpack.secops.networkTopNFlowTable.packets', {
  defaultMessage: 'Packets',
});

export const DURATION = i18n.translate('xpack.secops.networkTopNFlowTable.duration', {
  defaultMessage: 'Duration',
});

export const ROWS_5 = i18n.translate('xpack.secops.networkTopNFlowTable.rows', {
  values: { numRows: 5 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_10 = i18n.translate('xpack.secops.networkTopNFlowTable.rows', {
  values: { numRows: 10 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_20 = i18n.translate('xpack.secops.networkTopNFlowTable.rows', {
  values: { numRows: 20 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_50 = i18n.translate('xpack.secops.networkTopNFlowTable.rows', {
  values: { numRows: 50 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});
