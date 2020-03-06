/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const ERROR_RETRIEVING_USER_DETAILS = i18n.translate(
  'xpack.siem.recentTimelines.errorRetrievingUserDetailsMessage',
  {
    defaultMessage: 'Recent Timelines: An error occurred while retrieving user details',
  }
);

export const NO_FAVORITE_TIMELINES = i18n.translate(
  'xpack.siem.recentTimelines.noFavoriteTimelinesMessage',
  {
    defaultMessage:
      "You haven't favorited any timelines yet. Get out there and start threat hunting!",
  }
);

export const NO_TIMELINES = i18n.translate('xpack.siem.recentTimelines.noTimelinesMessage', {
  defaultMessage: "You haven't created any timelines yet. Get out there and start threat hunting!",
});

export const NOTES = i18n.translate('xpack.siem.recentTimelines.notesTooltip', {
  defaultMessage: 'Notes',
});

export const OPEN_AS_DUPLICATE = i18n.translate(
  'xpack.siem.recentTimelines.openAsDuplicateTooltip',
  {
    defaultMessage: 'Open as a duplicate timeline',
  }
);

export const PINNED_EVENTS = i18n.translate('xpack.siem.recentTimelines.pinnedEventsTooltip', {
  defaultMessage: 'Pinned events',
});

export const UNTITLED_TIMELINE = i18n.translate(
  'xpack.siem.recentTimelines.untitledTimelineLabel',
  {
    defaultMessage: 'Untitled timeline',
  }
);

export const VIEW_ALL_TIMELINES = i18n.translate(
  'xpack.siem.recentTimelines.viewAllTimelinesLink',
  {
    defaultMessage: 'View all timelines',
  }
);
