/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const EVENTS = i18n.translate('xpack.secops.eventsTable.events', {
  defaultMessage: 'Events',
});

export const HOST_NAME = i18n.translate('xpack.secops.eventsTable.hostsName', {
  defaultMessage: 'Host Name',
});

export const EVENT_TYPE = i18n.translate('xpack.secops.eventsTable.eventType', {
  defaultMessage: 'Event type',
});

export const SOURCE = i18n.translate('xpack.secops.eventsTable.source', {
  defaultMessage: 'Source',
});

export const DESTINATION = i18n.translate('xpack.secops.eventsTable.destination', {
  defaultMessage: 'Destination',
});

export const LOCATION = i18n.translate('xpack.secops.eventsTable.location', {
  defaultMessage: 'Location',
});

export const ROWS_5 = i18n.translate('xpack.secops.eventsTable.rows', {
  values: { numRows: 5 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_10 = i18n.translate('xpack.secops.eventsTable.rows', {
  values: { numRows: 10 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_20 = i18n.translate('xpack.secops.eventsTable.rows', {
  values: { numRows: 20 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_50 = i18n.translate('xpack.secops.eventsTable.rows', {
  values: { numRows: 50 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});
