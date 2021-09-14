/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const BULK_ACTIONS = '[data-test-subj="utility-bar-action-button"]';

export const EXPORT_TIMELINE_ACTION = '[data-test-subj="export-timeline-action"]';

export const TIMELINE = (id: string) => {
  return `[data-test-subj="title-${id}"]`;
};

export const TIMELINE_CHECKBOX = (id: string) => {
  return `[data-test-subj="checkboxSelectRow-${id}"]`;
};

export const TIMELINES_FAVORITE = '[data-test-subj="favorite-starFilled-star"]';

export const TIMELINES_DESCRIPTION = '[data-test-subj="description"]';

export const TIMELINES_NOTES_COUNT = '[data-test-subj="notes-count"]';

export const TIMELINES_PINNED_EVENT_COUNT = '[data-test-subj="pinned-event-count"]';

export const TIMELINES_TABLE = '[data-test-subj="timelines-table"]';

export const TIMELINES_USERNAME = '[data-test-subj="username"]';

export const REFRESH_BUTTON = '[data-test-subj="refreshButton-linkIcon"]';
