/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const TOP_TALKERS = i18n.translate('xpack.secops.networkTopNFlowTable.title', {
  defaultMessage: 'Top Talkers',
});

export const SOURCE_IP = i18n.translate(
  'xpack.secops.networkTopNFlowTable.source.ip.column.title',
  {
    defaultMessage: 'Source IP',
  }
);

export const DESTINATION_IP = i18n.translate(
  'xpack.secops.networkTopNFlowTable.destination.ip.column.title',
  {
    defaultMessage: 'Destination IP',
  }
);

export const CLIENT_IP = i18n.translate(
  'xpack.secops.networkTopNFlowTable.client.ip.column.title',
  {
    defaultMessage: 'Client IP',
  }
);

export const SERVER_IP = i18n.translate(
  'xpack.secops.networkTopNFlowTable.server.ip.column.title',
  {
    defaultMessage: 'Server IP',
  }
);

export const DOMAIN = i18n.translate('xpack.secops.networkTopNFlowTable.domain.column.title', {
  defaultMessage: 'Last Domain',
});

export const BYTES = i18n.translate('xpack.secops.networkTopNFlowTable.bytes.column.title', {
  defaultMessage: 'Bytes',
});

export const PACKETS = i18n.translate('xpack.secops.networkTopNFlowTable.packets.column.title', {
  defaultMessage: 'Packets',
});

export const DIRECTION = i18n.translate(
  'xpack.secops.networkTopNFlowTable.direction.column.title',
  {
    defaultMessage: 'Direction',
  }
);

export const UNIQUE_SOURCE_IP = i18n.translate(
  'xpack.secops.networkTopNFlowTable.uniqueSourceIps.column.title',
  {
    defaultMessage: 'Unique Source IPs',
  }
);

export const UNIQUE_DESTINATION_IP = i18n.translate(
  'xpack.secops.networkTopNFlowTable.uniqueDestinationIps.column.title',
  {
    defaultMessage: 'Unique Destination IPs',
  }
);

export const UNIQUE_CLIENT_IP = i18n.translate(
  'xpack.secops.networkTopNFlowTable.uniqueClientIps.column.title',
  {
    defaultMessage: 'Unique Client IPs',
  }
);

export const UNIQUE_SERVER_IP = i18n.translate(
  'xpack.secops.networkTopNFlowTable.uniqueServerIps.column.title',
  {
    defaultMessage: 'Unique Server IPs',
  }
);

export const FILTER_TO_KQL = i18n.translate(
  'xpack.secops.networkTopNFlowTable.filterToKQL.description',
  {
    defaultMessage: 'Add to KQL',
  }
);

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
