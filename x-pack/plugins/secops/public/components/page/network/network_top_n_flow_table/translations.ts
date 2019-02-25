/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const TOP_TALKERS = i18n.translate('xpack.secops.networkTopNFlowTable.title', {
  defaultMessage: 'Top Talkers',
});

export const SOURCE_IP = i18n.translate('xpack.secops.networkTopNFlowTable.column.sourceIpTitle', {
  defaultMessage: 'Source IP',
});

export const DESTINATION_IP = i18n.translate(
  'xpack.secops.networkTopNFlowTable.column.destinationIpTitle',
  {
    defaultMessage: 'Destination IP',
  }
);

export const CLIENT_IP = i18n.translate('xpack.secops.networkTopNFlowTable.column.clientIpTitle', {
  defaultMessage: 'Client IP',
});

export const SERVER_IP = i18n.translate('xpack.secops.networkTopNFlowTable.column.serverIpTitle', {
  defaultMessage: 'Server IP',
});

export const DOMAIN = i18n.translate('xpack.secops.networkTopNFlowTable.column.lastDomainTitle', {
  defaultMessage: 'Last Domain',
});

export const BYTES = i18n.translate('xpack.secops.networkTopNFlowTable.column.bytesTitle', {
  defaultMessage: 'Bytes',
});

export const PACKETS = i18n.translate('xpack.secops.networkTopNFlowTable.column.packetsTitle', {
  defaultMessage: 'Packets',
});

export const DIRECTION = i18n.translate('xpack.secops.networkTopNFlowTable.column.directionTitle', {
  defaultMessage: 'Direction',
});

export const UNIQUE_SOURCE_IP = i18n.translate(
  'xpack.secops.networkTopNFlowTable.column.uniqueSourceIpsTitle',
  {
    defaultMessage: 'Unique Source IPs',
  }
);

export const UNIQUE_DESTINATION_IP = i18n.translate(
  'xpack.secops.networkTopNFlowTable.column.uniqueDestinationIpsTitle',
  {
    defaultMessage: 'Unique Destination IPs',
  }
);

export const UNIQUE_CLIENT_IP = i18n.translate(
  'xpack.secops.networkTopNFlowTable.column.uniqueClientIpsTitle',
  {
    defaultMessage: 'Unique Client IPs',
  }
);

export const UNIQUE_SERVER_IP = i18n.translate(
  'xpack.secops.networkTopNFlowTable.column.uniqueServerIpsTitle',
  {
    defaultMessage: 'Unique Server IPs',
  }
);

export const BY_SOURCE_IP = i18n.translate(
  'xpack.secops.networkTopNFlowTable.select.bySourceIpTitle',
  {
    defaultMessage: 'By Source IP',
  }
);

export const BY_DESTINATION_IP = i18n.translate(
  'xpack.secops.networkTopNFlowTable.select.byDestinationIpTitle',
  {
    defaultMessage: 'By Destination IP',
  }
);

export const BY_CLIENT_IP = i18n.translate(
  'xpack.secops.networkTopNFlowTable.select.byClientIpSelector',
  {
    defaultMessage: 'By Client IP',
  }
);

export const BY_SERVER_IP = i18n.translate(
  'xpack.secops.networkTopNFlowTable.select.byServerIpSelector',
  {
    defaultMessage: 'By Server IP',
  }
);

export const FILTER_TO_KQL = i18n.translate(
  'xpack.secops.networkTopNFlowTable.description.filterToKQLDescription',
  {
    defaultMessage: 'Add to KQL',
  }
);

export const UNIDIRECTIONAL = i18n.translate(
  'xpack.secops.networkTopNFlowTable.unidirectionalDescription',
  {
    defaultMessage: 'Unidirectional',
  }
);

export const BIDIRECTIONAL = i18n.translate(
  'xpack.secops.networkTopNFlowTable.bidirectionalDescription',
  {
    defaultMessage: 'Bidirectional',
  }
);

export const MORE = i18n.translate('xpack.secops.networkTopNFlowTable.moreDescription', {
  defaultMessage: 'More ...',
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
