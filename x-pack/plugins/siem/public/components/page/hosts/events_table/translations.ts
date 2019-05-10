/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const EVENTS = i18n.translate('xpack.siem.eventsTable.eventsTitle', {
  defaultMessage: 'Events',
});

export const UNIT = (totalCount: number) =>
  i18n.translate('xpack.siem.eventsTable.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {Event} other {Events}}`,
  });

export const HOST_NAME = i18n.translate('xpack.siem.eventsTable.hostsNameTitle', {
  defaultMessage: 'Host Name',
});

export const EVENT_ACTION = i18n.translate('xpack.siem.eventsTable.eventTypeAction', {
  defaultMessage: 'Event Action',
});

export const EVENT_TYPE = i18n.translate('xpack.siem.eventsTable.eventTypeTitle', {
  defaultMessage: 'Event type',
});

export const SOURCE = i18n.translate('xpack.siem.eventsTable.sourceTitle', {
  defaultMessage: 'Source',
});

export const DESTINATION = i18n.translate('xpack.siem.eventsTable.destinationTitle', {
  defaultMessage: 'Destination',
});

export const LOCATION = i18n.translate('xpack.siem.eventsTable.locationTitle', {
  defaultMessage: 'Location',
});

export const ROWS_5 = i18n.translate('xpack.siem.eventsTable.rows', {
  values: { numRows: 5 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_10 = i18n.translate('xpack.siem.eventsTable.rows', {
  values: { numRows: 10 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_20 = i18n.translate('xpack.siem.eventsTable.rows', {
  values: { numRows: 20 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_50 = i18n.translate('xpack.siem.eventsTable.rows', {
  values: { numRows: 50 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});
