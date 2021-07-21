/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SHOWING = i18n.translate('xpack.timelines.eventsViewer.showingLabel', {
  defaultMessage: 'Showing',
});

export const ERROR_FETCHING_EVENTS_DATA = i18n.translate(
  'xpack.timelines.eventsViewer.errorFetchingEventsData',
  {
    defaultMessage: 'Failed to query events data',
  }
);

export const EVENTS = i18n.translate('xpack.timelines.eventsViewer.eventsLabel', {
  defaultMessage: 'Events',
});

export const LOADING_EVENTS = i18n.translate(
  'xpack.timelines.eventsViewer.footer.loadingEventsDataLabel',
  {
    defaultMessage: 'Loading Events',
  }
);

export const UNIT = (totalCount: number) =>
  i18n.translate('xpack.timelines.eventsViewer.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {event} other {events}}`,
  });
