/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
    defaultMessage: 'Import',
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

export const TIMELINE_VERSION_CONFLICT_TITLE = i18n.translate(
  'xpack.securitySolution.timelines.timelineVersionConflictTitle',
  {
    defaultMessage: 'Version conflict',
  }
);

export const TIMELINE_VERSION_CONFLICT_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.timelines.timelineVersionConflictDescription',
  {
    defaultMessage:
      'Another user has made changes to this timeline. You need to refresh the page to make changes to this timeline.',
  }
);
