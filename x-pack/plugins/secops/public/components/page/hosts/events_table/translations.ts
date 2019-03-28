/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const EVENTS = i18n.translate('xpack.secops.eventsTable.eventsTitle', {
  defaultMessage: 'Events',
});

export const HOST_NAME = i18n.translate('xpack.secops.eventsTable.hostsNameTitle', {
  defaultMessage: 'Host Name',
});

export const EVENT_ACTION = i18n.translate('xpack.secops.eventsTable.eventTypeAction', {
  defaultMessage: 'Event Action',
});

export const EVENT_CATEGORY = i18n.translate('xpack.secops.eventsTable.eventCategoryTitle', {
  defaultMessage: 'Event Category',
});

export const EVENT_TYPE = i18n.translate('xpack.secops.eventsTable.eventTypeTitle', {
  defaultMessage: 'Event type',
});

export const SOURCE = i18n.translate('xpack.secops.eventsTable.sourceTitle', {
  defaultMessage: 'Source',
});

export const DESTINATION = i18n.translate('xpack.secops.eventsTable.destinationTitle', {
  defaultMessage: 'Destination',
});

export const MESSAGE = i18n.translate('xpack.secops.eventsTable.messageTitle', {
  defaultMessage: 'Message',
});

export const EVENT_MODULE_DATASET = i18n.translate('xpack.secops.eventsTable.moduleDatasetTitle', {
  defaultMessage: 'Module/Dataset',
});

export const USER = i18n.translate('xpack.secops.eventsTable.userTitle', {
  defaultMessage: 'User',
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
