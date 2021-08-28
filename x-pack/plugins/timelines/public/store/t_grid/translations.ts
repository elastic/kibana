/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const EVENTS = i18n.translate('xpack.timelines.tGrid.eventsLabel', {
  defaultMessage: 'Events',
});

export const LOADING_EVENTS = i18n.translate(
  'xpack.timelines.tGrid.footer.loadingEventsDataLabel',
  {
    defaultMessage: 'Loading Events',
  }
);

export const UNIT = (totalCount: number) =>
  i18n.translate('xpack.timelines.tGrid.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {alert} other {alerts}}`,
  });

export const TOTAL_COUNT_OF_EVENTS = i18n.translate(
  'xpack.timelines.tGrid.footer.totalCountOfEvents',
  {
    defaultMessage: 'events',
  }
);
