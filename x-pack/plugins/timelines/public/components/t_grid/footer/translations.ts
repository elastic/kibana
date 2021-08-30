/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const LOADING_TIMELINE_DATA = i18n.translate('xpack.timelines.footer.loadingTimelineData', {
  defaultMessage: 'Loading Timeline data',
});

export const EVENTS = i18n.translate('xpack.timelines.footer.events', {
  defaultMessage: 'Events',
});

export const OF = i18n.translate('xpack.timelines.footer.of', {
  defaultMessage: 'of',
});

export const ROWS = i18n.translate('xpack.timelines.footer.rows', {
  defaultMessage: 'rows',
});

export const LOADING = i18n.translate('xpack.timelines.footer.loadingLabel', {
  defaultMessage: 'Loading',
});

export const ROWS_PER_PAGE = (rowsPerPage: number) =>
  i18n.translate('xpack.timelines.footer.rowsPerPageLabel', {
    values: { rowsPerPage },
    defaultMessage: `Rows per page: {rowsPerPage}`,
  });

export const TOTAL_COUNT_OF_EVENTS = i18n.translate('xpack.timelines.footer.totalCountOfEvents', {
  defaultMessage: 'events',
});

export const AUTO_REFRESH_ACTIVE = i18n.translate(
  'xpack.timelines.footer.autoRefreshActiveDescription',
  {
    defaultMessage: 'Auto-Refresh Active',
  }
);
