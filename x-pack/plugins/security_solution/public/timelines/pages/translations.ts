/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const PAGE_TITLE = i18n.translate('xpack.securitySolution.timelines.pageTitle', {
  defaultMessage: 'Timelines',
});

export const ALL_TIMELINES_PANEL_TITLE = i18n.translate(
  'xpack.securitySolution.timelines.allTimelines.panelTitle',
  {
    defaultMessage: 'All timelines',
  }
);

export const ALL_TIMELINES_IMPORT_TIMELINE_TITLE = i18n.translate(
  'xpack.securitySolution.timelines.allTimelines.importTimelineTitle',
  {
    defaultMessage: 'Import Timeline',
  }
);

export const ERROR_FETCHING_TIMELINES_TITLE = i18n.translate(
  'xpack.securitySolution.timelines.allTimelines.errorFetchingTimelinesTitle',
  {
    defaultMessage: 'Failed to query all timelines data',
  }
);

export const UPDATE_TIMELINE_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.timelines.updateTimelineErrorTitle',
  {
    defaultMessage: 'Timeline error',
  }
);

export const UPDATE_TIMELINE_ERROR_TEXT = i18n.translate(
  'xpack.securitySolution.timelines.updateTimelineErrorText',
  {
    defaultMessage: 'Something went wrong',
  }
);
