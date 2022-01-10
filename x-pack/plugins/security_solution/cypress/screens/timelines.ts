/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const BULK_ACTIONS = '[data-test-subj="utility-bar-action-button"]';

export const EXPAND_NOTES_BTN = '[data-test-subj="expand-notes"]';

export const EXPORT_TIMELINE_ACTION = '[data-test-subj="export-timeline-action"]';

export const IMPORT_BTN = '.euiButton.euiButton--primary.euiButton--fill';

export const IMPORT_TIMELINE_BTN = '[data-test-subj="open-import-data-modal-btn"]';

export const INPUT_FILE = 'input[type=file]';

export const NOTE = '[data-test-subj^="note-preview-"]';

export const TIMELINE = (id: string | undefined) => {
  if (id == null) {
    throw new TypeError('id should never be null or undefined');
  }
  return `[data-test-subj="title-${id}"]`;
};

export const TIMELINE_CHECKBOX = (id: string) => {
  return `[data-test-subj="checkboxSelectRow-${id}"]`;
};

export const TIMELINE_NAME = '[data-test-subj^=title]';

export const TIMELINES_FAVORITE = '[data-test-subj="favorite-starFilled-star"]';

export const TIMELINES_DESCRIPTION = '[data-test-subj="description"]';

export const TIMELINES_NOTES_COUNT = '[data-test-subj="notes-count"]';

export const TIMELINES_PINNED_EVENT_COUNT = '[data-test-subj="pinned-event-count"]';

export const TIMELINES_TABLE = '[data-test-subj="timelines-table"]';

export const TIMELINES_USERNAME = '[data-test-subj="username"]';

export const REFRESH_BUTTON = '[data-test-subj="refreshButton-linkIcon"]';

export const TIMELINES_OVERVIEW = '[data-test-subj="timelines-container"]';

export const TIMELINES_OVERVIEW_ONLY_FAVORITES = `${TIMELINES_OVERVIEW} [data-test-subj="only-favorites-toggle"]`;

export const TIMELINES_OVERVIEW_SEARCH = `${TIMELINES_OVERVIEW} [data-test-subj="search-bar"]`;

export const TIMELINES_OVERVIEW_TABLE = `${TIMELINES_OVERVIEW} [data-test-subj="timelines-table"]`;
